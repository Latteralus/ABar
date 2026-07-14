import { getProperty } from "@/data/properties";
import { CLOSING_CONFIG, CUSTOMER_BEHAVIOR_CONFIG } from "@/config/customerConfig";
import { TV_CONFIG } from "@/config/tvConfig";
import { JUKEBOX_CONFIG } from "@/config/jukeboxConfig";
import { SOCIAL_FLAVOR_GENERIC, SOCIAL_FLAVOR_WITH_STAFF } from "@/data/customers/socialFlavor";
import { fillTemplate } from "@/utils/flavorText";
import { clampRound } from "@/utils/clamp";
import { abandonAttractionQueue, removeCustomerFromAttractions } from "./attractionQueue";
import { attractionWaitToleranceMinutes } from "./attractionSessions";
import { maybeGenerateReview } from "./reviews";
import { hasOperationalTv } from "./tvEffects";
import { hasOperationalJukebox } from "./jukeboxEffects";
import { effectiveSeatingCapacity } from "@/data/equipment/equipmentCatalog";
import { customerSpentSoFar } from "./payments";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Customer, CustomerLeaveReason, GameState, OwnedPropertyState } from "@/types";
import { logActivity } from "./activityLogger";

function setStatus(customer: Customer, status: Customer["status"], atMinute: number): void {
  customer.status = status;
  customer.statusEnteredAtGameMinute = atMinute;
}

function waitToleranceMinutes(customer: Customer): number {
  return CUSTOMER_BEHAVIOR_CONFIG.baseWaitToleranceMinutes + customer.patience * CUSTOMER_BEHAVIOR_CONFIG.waitToleranceSkillScale;
}

function isPastFinalCall(state: GameState): boolean {
  return state.gameMinute >= CLOSING_CONFIG.finalCallGameMinute;
}

function isPastWindDown(state: GameState): boolean {
  return state.gameMinute >= CLOSING_CONFIG.windDownGameMinute;
}

/** Cosmetic-only "chatted with..." log line — no mechanical effect beyond the caller's own satisfaction nudge. */
function logSocialFlavor(state: GameState, prop: OwnedPropertyState, bus: EventBus, rng: SeededRandom, customer: Customer): void {
  const staffCandidates = prop.employees.filter((e) => e.role === "bartender" || e.role === "server");
  const customerName = `${customer.firstName} ${customer.lastName}`;

  if (staffCandidates.length > 0 && rng.chance(0.4)) {
    const employee = rng.pick(staffCandidates);
    const template = rng.pick(SOCIAL_FLAVOR_WITH_STAFF);
    logActivity(
      state,
      bus,
      "customer",
      fillTemplate(template, { customer: customerName, employee: `${employee.firstName} ${employee.lastName}` }),
    );
  } else {
    const template = rng.pick(SOCIAL_FLAVOR_GENERIC);
    logActivity(state, bus, "customer", fillTemplate(template, { customer: customerName }));
  }
}

export function departCustomer(
  state: GameState,
  prop: OwnedPropertyState,
  bus: EventBus,
  rng: SeededRandom,
  customer: Customer,
  reason: CustomerLeaveReason,
): void {
  removeCustomerFromAttractions(state, prop, bus, customer.id);
  customer.leaveReason = reason;
  setStatus(customer, "left", state.gameMinute);
  const dissatisfaction: Partial<Record<CustomerLeaveReason, number>> = {
    no_seating: 10,
    wait_too_long: 15,
    price_too_high: 5,
    item_unavailable: 10,
    closing_time: 0,
    satisfied_departure: 0,
    dissatisfied: 15,
    removed_intoxication: 25,
  };
  customer.satisfaction = clampRound(customer.satisfaction - (dissatisfaction[reason] ?? 0));
  maybeGenerateReview(state, prop, bus, rng, customer);
  bus.emit("customer:left", { customer });
}

/** Advances every active customer one game-minute: seating, patience timeouts, and consumption pacing. */
export function advanceCustomers(state: GameState, prop: OwnedPropertyState, rng: SeededRandom, bus: EventBus): void {
  if (state.gameMinute === CLOSING_CONFIG.finalCallGameMinute) {
    logActivity(state, bus, "system", "Last call! No new customers and no new rounds for the rest of the night.");
  }

  const property = getProperty(prop.propertyId);
  const seatedCount = prop.customers.filter((c) => c.seatId !== null && c.status !== "left" && c.status !== "removed").length;
  let availableSeats = effectiveSeatingCapacity(prop, property).seatingCapacity - seatedCount;
  // With a host on staff, seating goes through a real seat_customer task (see seatingTasks.ts)
  // instead of auto-assigning — that's what gives the host role something to actually do.
  const hasHost = prop.employees.some((e) => e.role === "host");

  for (const customer of prop.customers) {
    const waitedMinutes = state.gameMinute - customer.statusEnteredAtGameMinute;

    switch (customer.status) {
      case "arriving": {
        if (!hasHost && availableSeats > 0) {
          customer.seatId = customer.id;
          availableSeats -= 1;
          setStatus(customer, "waiting_to_order", state.gameMinute);
          bus.emit("customer:seated", { customer });
        } else {
          setStatus(customer, "waiting_for_seat", state.gameMinute);
        }
        break;
      }
      case "waiting_for_seat": {
        if (!hasHost && availableSeats > 0) {
          customer.seatId = customer.id;
          availableSeats -= 1;
          setStatus(customer, "waiting_to_order", state.gameMinute);
          bus.emit("customer:seated", { customer });
        } else if (waitedMinutes > waitToleranceMinutes(customer)) {
          departCustomer(state, prop, bus, rng, customer, "no_seating");
          logActivity(state, bus, "customer", `${customer.firstName} ${customer.lastName} left after finding no open seating.`);
        }
        break;
      }
      case "waiting_to_order":
      case "waiting_for_drink":
      case "waiting_for_food": {
        if (waitedMinutes > waitToleranceMinutes(customer)) {
          departCustomer(state, prop, bus, rng, customer, "wait_too_long");
          logActivity(state, bus, "customer", `${customer.firstName} ${customer.lastName} left after waiting too long.`, "warning");
        }
        break;
      }
      case "consuming": {
        // phaseTargetMinutes was rolled when the drink was delivered (employeeAI.handleDeliverItemComplete).
        const tvOn = hasOperationalTv(prop);
        const jukeboxOn = hasOperationalJukebox(prop);
        if (tvOn) customer.satisfaction = clampRound(customer.satisfaction + TV_CONFIG.satisfactionBonusPerMinute);
        if (jukeboxOn) customer.satisfaction = clampRound(customer.satisfaction + JUKEBOX_CONFIG.satisfactionBonusPerMinute);
        const target = customer.phaseTargetMinutes ?? CUSTOMER_BEHAVIOR_CONFIG.consumingDurationMinutesRange[0];
        if (waitedMinutes >= target || isPastWindDown(state)) {
          const [min, max] = CUSTOMER_BEHAVIOR_CONFIG.socializingDurationMinutesRange;
          customer.phaseTargetMinutes =
            rng.int(min, max) + (tvOn ? TV_CONFIG.dwellTimeBonusMinutes : 0) + (jukeboxOn ? JUKEBOX_CONFIG.dwellTimeBonusMinutes : 0);
          setStatus(customer, "deciding_next_order", state.gameMinute);
        }
        break;
      }
      case "deciding_next_order": {
        // This is the "hanging out" beat: chatting, people-watching, nursing what's left of the
        // drink — not a tight "decide in the next few minutes" window. See PROJECT_STATUS.md §3.
        if (rng.chance(CUSTOMER_BEHAVIOR_CONFIG.socializingFlavorChancePerMinute)) {
          logSocialFlavor(state, prop, bus, rng, customer);
        }
        const tvBonus = hasOperationalTv(prop) ? TV_CONFIG.satisfactionBonusPerMinute : 0;
        const jukeboxBonus = hasOperationalJukebox(prop) ? JUKEBOX_CONFIG.satisfactionBonusPerMinute : 0;
        customer.satisfaction = clampRound(
          customer.satisfaction + CUSTOMER_BEHAVIOR_CONFIG.socializingSatisfactionPerMinute + tvBonus + jukeboxBonus,
        );

        const socializingTarget = customer.phaseTargetMinutes ?? CUSTOMER_BEHAVIOR_CONFIG.socializingDurationMinutesRange[0];
        if (waitedMinutes < socializingTarget && !isPastWindDown(state)) break;

        // One decision, made once the socializing window is up — not re-rolled every minute.
        const visitMinutes = state.gameMinute - customer.arrivalGameMinute;
        const canAfford = customerSpentSoFar(prop, customer) < customer.spendingBudget;
        const roundsSoFar = customer.itemsOrderedCount;
        const diminishingFactor = Math.max(
          CUSTOMER_BEHAVIOR_CONFIG.reorderDiminishingReturnsFloor,
          1 - roundsSoFar * CUSTOMER_BEHAVIOR_CONFIG.reorderDiminishingReturnsPerRound,
        );
        const reorderChance = (customer.reorderTendency / 100) * CUSTOMER_BEHAVIOR_CONFIG.reorderChanceOnDecision * diminishingFactor;
        const withinVisitCap = visitMinutes < CUSTOMER_BEHAVIOR_CONFIG.maxVisitMinutesBeforeCheck;
        const wantsMore =
          !isPastFinalCall(state) &&
          canAfford &&
          withinVisitCap &&
          roundsSoFar < CUSTOMER_BEHAVIOR_CONFIG.maxRoundsPerVisit &&
          rng.chance(reorderChance);

        customer.phaseTargetMinutes = undefined;
        if (wantsMore) {
          setStatus(customer, "waiting_to_order", state.gameMinute);
        } else {
          // A customer whose only order(s) failed to prepare (stockout) has an open tab with
          // nothing on it — there's nothing to pay for, so send them straight out the door
          // instead of running them through process_payment for a nonsensical $0.00 receipt.
          const tab = prop.tabs.find((t) => t.id === customer.tabId);
          if (!tab || tab.lineItems.length === 0) {
            if (tab) {
              tab.status = "closed";
              tab.closedAtGameMinute = state.gameMinute;
            }
            departCustomer(state, prop, bus, rng, customer, "item_unavailable");
            logActivity(
              state,
              bus,
              "customer",
              `${customer.firstName} ${customer.lastName} left without ordering anything available.`,
              "warning",
            );
          } else {
            setStatus(customer, "waiting_to_pay", state.gameMinute);
          }
        }
        break;
      }
      case "waiting_for_attraction": {
        if (isPastWindDown(state) || waitedMinutes > attractionWaitToleranceMinutes(customer.patience)) {
          abandonAttractionQueue(state, prop, bus, customer);
        }
        break;
      }
      case "using_attraction": {
        // Session countdown/completion is driven once per table by attractionSessions.advanceAttractionSessions, not per participant here.
        break;
      }
      case "leaving": {
        // Tab is already closed — they're just finishing their drink and saying their goodbyes.
        if (waitedMinutes >= CUSTOMER_BEHAVIOR_CONFIG.departureLingerMinutes) {
          departCustomer(state, prop, bus, rng, customer, customer.leaveReason ?? "satisfied_departure");
          logActivity(state, bus, "customer", `${customer.firstName} ${customer.lastName} finished up and left.`);
        }
        break;
      }
      default:
        break;
    }
  }

  // Force everyone still inside toward the door as closing approaches.
  if (state.gameMinute >= CLOSING_CONFIG.hardSweepGameMinute) {
    for (const customer of prop.customers) {
      if (customer.status === "left" || customer.status === "removed") continue;
      if (customer.status === "waiting_for_attraction" || customer.status === "using_attraction") {
        removeCustomerFromAttractions(state, prop, bus, customer.id);
      }
      if (customer.status === "leaving") {
        departCustomer(state, prop, bus, rng, customer, customer.leaveReason ?? "satisfied_departure");
      } else if (customer.status === "waiting_to_pay") {
        continue;
      } else if (customer.tabId) {
        setStatus(customer, "waiting_to_pay", state.gameMinute);
      } else {
        departCustomer(state, prop, bus, rng, customer, "closing_time");
      }
    }
  }

  // Customers who left stay in the array (status "left") for the rest of the day so the daily
  // report can be derived from it; dayCycle.openDay() clears the roster for the next day.
}

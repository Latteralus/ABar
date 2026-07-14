import { CLOSING_CONFIG, CUSTOMER_ARRIVAL_CONFIG } from "@/config/customerConfig";
import { getProperty } from "@/data/properties";
import { createId } from "@/services/idService";
import { minuteOfDayToClockTime } from "@/simulation/clock/gameTime";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { GameState, OwnedPropertyState } from "@/types";
import { generateCustomer } from "./customerFactory";
import { logActivity } from "./activityLogger";
import { reputationDemandMultiplier } from "./reputation";
import { activePromotionDemandMultiplier } from "./advertising";
import { neighborhoodDemandMultiplier } from "./neighborhood";

function countActiveCustomers(prop: OwnedPropertyState): number {
  return prop.customers.filter((c) => c.status !== "left" && c.status !== "removed").length;
}

/** Decides whether new customers walk in this minute, respecting property capacity (Master Plan Section 10). */
export function processArrivals(state: GameState, prop: OwnedPropertyState, rng: SeededRandom, bus: EventBus): void {
  if (state.gameMinute >= CLOSING_CONFIG.finalCallGameMinute) return; // no new walk-ins past final call

  const property = getProperty(prop.propertyId);
  const activeCount = countActiveCustomers(prop);
  if (activeCount >= property.customerCapacity) return;

  const { hour } = minuteOfDayToClockTime(state.gameMinute);
  const demandMultiplier =
    (CUSTOMER_ARRIVAL_CONFIG.hourlyDemandMultiplier[hour] ?? 0.5) *
    reputationDemandMultiplier(prop) *
    activePromotionDemandMultiplier(state, prop) *
    neighborhoodDemandMultiplier(property);
  const arrivalChance = CUSTOMER_ARRIVAL_CONFIG.baseArrivalChancePerMinute * demandMultiplier;

  if (!rng.chance(arrivalChance)) return;

  const groupSize = rng.weightedPick(CUSTOMER_ARRIVAL_CONFIG.groupSizeWeights);
  const room = property.customerCapacity - activeCount;
  const actualSize = Math.min(groupSize, room);
  if (actualSize <= 0) return;

  const groupId = actualSize > 1 ? createId("group") : null;
  const memberIds: string[] = [];

  for (let i = 0; i < actualSize; i++) {
    const customer = generateCustomer(rng, state.gameMinute, groupId, property.neighborhood.averageCustomerIncome);
    prop.customers.push(customer);
    memberIds.push(customer.id);
    bus.emit("customer:arrived", { customer });
  }

  if (groupId) {
    prop.customerGroups.push({ id: groupId, memberIds, arrivalGameMinute: state.gameMinute });
  }

  const label =
    actualSize === 1
      ? `${prop.customers[prop.customers.length - 1].firstName} ${prop.customers[prop.customers.length - 1].lastName}`
      : `A group of ${actualSize}`;
  logActivity(state, bus, "customer", `${label} entered.`);
}

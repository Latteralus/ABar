import { CUSTOMER_BEHAVIOR_CONFIG, REMOVAL_CONFIG } from "@/config/customerConfig";
import { createServiceTask } from "@/simulation/tasks/taskQueue";
import { rolesFor } from "@/simulation/tasks/roleEligibility";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { GameState } from "@/types";
import { departCustomer } from "./customerLifecycle";
import { hasCalmBonus } from "./personalityEffects";
import { logActivity } from "./activityLogger";

/**
 * Handles customers who've crossed the intoxication removal threshold (Master Plan Section 11).
 * If security is on staff, a formal remove_customer task is queued. Otherwise a bartender/server
 * asks them to leave; they either cooperate or staff call the police — a short, log-driven
 * resolution, not a detailed crime simulation (explicitly out of scope per the spec).
 */
export function processIntoxicatedCustomers(state: GameState, rng: SeededRandom, bus: EventBus): void {
  const hasSecurity = state.employees.some((e) => e.role === "security");
  const calmStaffOnDuty = state.employees.some(
    (e) => (e.role === "bartender" || e.role === "server") && hasCalmBonus(e),
  );

  for (const customer of state.customers) {
    if (customer.status === "left" || customer.status === "removed") continue;
    if (customer.intoxication < CUSTOMER_BEHAVIOR_CONFIG.intoxicationRemovalThreshold) continue;

    if (hasSecurity) {
      const hasRemovalTask = state.tasks.some(
        (t) => t.customerId === customer.id && t.type === "remove_customer" && t.status !== "complete" && t.status !== "cancelled",
      );
      if (!hasRemovalTask) {
        state.tasks.push(
          createServiceTask({
            type: "remove_customer",
            eligibleRoles: rolesFor("remove_customer"),
            requiredSkill: "security",
            durationGameMinutes: 2,
            priority: 5,
            customerId: customer.id,
            createdAtGameMinute: state.gameMinute,
          }),
        );
      }
      continue;
    }

    // No security: a staff member asks them to leave, then escalates to the police if refused.
    if (!customer.removalStage) {
      customer.removalStage = "warned";
      customer.removalStageEnteredAtGameMinute = state.gameMinute;
      logActivity(state, bus, "customer", `A staff member asked ${customer.firstName} ${customer.lastName} to leave — too intoxicated.`, "warning");
      continue;
    }

    const stageWaited = state.gameMinute - (customer.removalStageEnteredAtGameMinute ?? state.gameMinute);

    if (customer.removalStage === "warned" && stageWaited >= REMOVAL_CONFIG.warnedResolutionMinutes) {
      const cooperateChance = REMOVAL_CONFIG.baseCooperateChance + (calmStaffOnDuty ? REMOVAL_CONFIG.calmCooperateBonus : 0);
      if (rng.chance(cooperateChance)) {
        departCustomer(state, bus, rng, customer, "removed_intoxication");
        logActivity(state, bus, "customer", `${customer.firstName} ${customer.lastName} cooperated and left.`);
      } else {
        customer.removalStage = "police_called";
        customer.removalStageEnteredAtGameMinute = state.gameMinute;
        logActivity(state, bus, "customer", `${customer.firstName} ${customer.lastName} refused to leave — staff called the police.`, "critical");
      }
      continue;
    }

    if (customer.removalStage === "police_called" && stageWaited >= REMOVAL_CONFIG.policeResolutionMinutes) {
      departCustomer(state, bus, rng, customer, "removed_intoxication");
      customer.status = "removed";
      logActivity(state, bus, "customer", `Police removed ${customer.firstName} ${customer.lastName}.`, "critical");
    }
  }
}

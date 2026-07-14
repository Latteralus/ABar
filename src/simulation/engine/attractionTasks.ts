import { ATTRACTION_CONFIG } from "@/config/attractionConfig";
import { createServiceTask } from "@/simulation/tasks/taskQueue";
import { rolesFor } from "@/simulation/tasks/roleEligibility";
import { isAttractionUsable } from "./attractionCondition";
import { logActivity } from "./activityLogger";
import { postLedger } from "./ledger";
import type { EventBus } from "@/simulation/events/EventBus";
import type { Employee, GameState, OwnedPropertyState, ServiceTask } from "@/types";

/** Auto-queues repair_attraction (on failure, mirrors equipmentMaintenance.ensureMaintenanceTasks) and clean_attraction (reset after N games, mirrors cleaning.ensureCleaningTasks) tasks. */
export function ensureAttractionTasks(state: GameState, prop: OwnedPropertyState, bus: EventBus): void {
  const hasMaintenanceStaff = prop.employees.some((e) => e.role === "maintenance");
  const hasPendingTaskFor = (attractionId: string, type: "repair_attraction" | "clean_attraction") =>
    prop.tasks.some((t) => t.type === type && t.attractionId === attractionId && t.status !== "complete" && t.status !== "cancelled");

  for (const attraction of prop.attractions) {
    if (attraction.currentStatus === "failed" && hasMaintenanceStaff && !hasPendingTaskFor(attraction.id, "repair_attraction")) {
      attraction.currentStatus = "awaiting_repair";
      prop.tasks.push(
        createServiceTask({
          type: "repair_attraction",
          eligibleRoles: rolesFor("repair_attraction"),
          requiredSkill: "accuracy",
          durationGameMinutes: ATTRACTION_CONFIG.employeeRepairBaseDurationMinutes,
          attractionId: attraction.id,
          createdAtGameMinute: state.gameMinute,
        }),
      );
      logActivity(state, bus, "attraction", `A repair was queued for ${attraction.name}.`, "info", attraction.id);
    }

    if (
      isAttractionUsable(attraction) &&
      !attraction.activeSession &&
      attraction.gamesPlayedSinceClean >= ATTRACTION_CONFIG.gamesBetweenCleanings &&
      !hasPendingTaskFor(attraction.id, "clean_attraction")
    ) {
      prop.tasks.push(
        createServiceTask({
          type: "clean_attraction",
          eligibleRoles: rolesFor("clean_attraction"),
          requiredSkill: "cleanliness",
          durationGameMinutes: ATTRACTION_CONFIG.cleanTaskDurationMinutes,
          attractionId: attraction.id,
          createdAtGameMinute: state.gameMinute,
        }),
      );
    }
  }
}

export function handleCleanAttractionComplete(state: GameState, prop: OwnedPropertyState, bus: EventBus, task: ServiceTask, employee: Employee): void {
  const attraction = prop.attractions.find((a) => a.id === task.attractionId);
  if (!attraction) return;
  attraction.gamesPlayedSinceClean = 0;
  logActivity(state, bus, "attraction", `${employee.firstName} ${employee.lastName} reset ${attraction.name} for the next group.`);
}

export function handleRepairAttractionComplete(state: GameState, prop: OwnedPropertyState, bus: EventBus, task: ServiceTask, employee: Employee): void {
  const attraction = prop.attractions.find((a) => a.id === task.attractionId);
  if (!attraction) return;

  attraction.condition = ATTRACTION_CONFIG.conditionAfterRepair;
  attraction.currentStatus = "operational";
  attraction.repairHistory.push({
    gameDay: state.gameDay,
    gameMinute: state.gameMinute,
    method: "employee",
    costCents: ATTRACTION_CONFIG.employeeRepairPartsCostCents,
  });

  postLedger(state, {
    category: "opex_maintenance",
    type: "debit",
    amount: ATTRACTION_CONFIG.employeeRepairPartsCostCents,
    description: `Repair parts — ${attraction.name}`,
    relatedEntityId: attraction.id,
    propertyId: prop.propertyId,
  });

  logActivity(state, bus, "attraction", `${employee.firstName} ${employee.lastName} repaired ${attraction.name}.`);
}

/** Resolves any contract repairs whose delay has elapsed — called from dayCycle.openDay, mirrors resolveDueContractRepairs. */
export function resolveDueAttractionContractRepairs(state: GameState, prop: OwnedPropertyState, bus: EventBus): void {
  for (const attraction of prop.attractions) {
    if (attraction.contractRepairDueGameDay === undefined || state.gameDay < attraction.contractRepairDueGameDay) continue;

    attraction.condition = ATTRACTION_CONFIG.conditionAfterRepair;
    attraction.currentStatus = "operational";
    attraction.repairHistory.push({
      gameDay: state.gameDay,
      gameMinute: state.gameMinute,
      method: "contract",
      costCents: ATTRACTION_CONFIG.contractRepairCostCents,
    });
    attraction.contractRepairDueGameDay = undefined;

    logActivity(state, bus, "attraction", `A contractor repaired ${attraction.name}.`, "info", attraction.id);
  }
}

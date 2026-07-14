import { MAINTENANCE_CONFIG } from "@/config/maintenanceConfig";
import { createServiceTask } from "@/simulation/tasks/taskQueue";
import { rolesFor } from "@/simulation/tasks/roleEligibility";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Equipment, EquipmentCategory, GameState, OwnedPropertyState } from "@/types";
import { logActivity } from "./activityLogger";

/** Only operational/degraded equipment actually works — failed/awaiting_repair/under_repair does not (Master Plan Section 34). */
export function isEquipmentUsable(equipment: Equipment): boolean {
  return equipment.currentStatus === "operational" || equipment.currentStatus === "degraded";
}

function bestUsableCondition(prop: OwnedPropertyState, category: EquipmentCategory): number | undefined {
  const usable = prop.equipment.filter((e) => e.category === category && isEquipmentUsable(e));
  if (usable.length === 0) return undefined;
  return Math.max(...usable.map((e) => e.condition));
}

/** 0..1, how far into the degraded range the healthiest usable unit is. 0 = at/above the threshold (no penalty), 1 = fully worn. */
function degradedSeverity(prop: OwnedPropertyState, category: EquipmentCategory): number {
  const best = bestUsableCondition(prop, category);
  if (best === undefined || best >= MAINTENANCE_CONFIG.degradedConditionThreshold) return 0;
  return (MAINTENANCE_CONFIG.degradedConditionThreshold - best) / MAINTENANCE_CONFIG.degradedConditionThreshold;
}

/** Highest speedRating among usable units of a category — mirrors bestUsableCondition's "healthiest unit masks a broken one" convention. */
function bestUsableSpeedRating(prop: OwnedPropertyState, category: EquipmentCategory): number | undefined {
  const usable = prop.equipment.filter((e) => e.category === category && isEquipmentUsable(e));
  if (usable.length === 0) return undefined;
  return Math.max(...usable.map((e) => e.speedRating));
}

/**
 * Task-duration multiplier for tasks that depend on a given equipment category (undefined category
 * = no effect). Combines two independent factors multiplicatively: condition-based wear (existing)
 * and speedRating (a tier-3 station is genuinely faster than a tier-1 one at full condition, not
 * just pricier — previously speedRating was copied onto every purchase and never read anywhere).
 * baselineSpeedRating (50) is a no-op multiplier so starter equipment's day-1 behavior is unchanged.
 */
export function equipmentSpeedMultiplier(prop: OwnedPropertyState, category?: EquipmentCategory): number {
  if (!category) return 1;
  const conditionMultiplier = 1 + degradedSeverity(prop, category) * MAINTENANCE_CONFIG.speedPenaltyAtZeroCondition;
  const rating = bestUsableSpeedRating(prop, category);
  const ratingMultiplier =
    rating === undefined
      ? 1
      : Math.min(
          MAINTENANCE_CONFIG.speedRatingMultiplierCeiling,
          Math.max(MAINTENANCE_CONFIG.speedRatingMultiplierFloor, MAINTENANCE_CONFIG.baselineSpeedRating / rating),
        );
  return conditionMultiplier * ratingMultiplier;
}

/** Ingredient-waste multiplier for recipes that depend on a given equipment category (undefined category = no effect). */
export function equipmentWasteMultiplier(prop: OwnedPropertyState, category?: EquipmentCategory): number {
  if (!category) return 1;
  return 1 + degradedSeverity(prop, category) * MAINTENANCE_CONFIG.wastePenaltyAtZeroCondition;
}

/** Extra wear from actually using a piece of equipment (e.g. one prepare_drink completion). */
export function decayEquipmentOnUse(prop: OwnedPropertyState, category: EquipmentCategory): void {
  for (const eq of prop.equipment) {
    if (eq.category !== category || !isEquipmentUsable(eq)) continue;
    eq.condition = Math.max(0, eq.condition - MAINTENANCE_CONFIG.usageConditionDecayPerTask);
  }
}

/** Flat time-based wear for every owned, in-service item, once per operating day (Master Plan Section 34). */
export function applyDailyEquipmentWear(state: GameState, prop: OwnedPropertyState, bus: EventBus): void {
  for (const eq of prop.equipment) {
    if (!isEquipmentUsable(eq)) continue;
    const wasOperational = eq.currentStatus === "operational";
    eq.condition = Math.max(0, eq.condition - MAINTENANCE_CONFIG.dailyConditionDecay);

    if (eq.condition < MAINTENANCE_CONFIG.degradedConditionThreshold) {
      if (wasOperational) {
        eq.currentStatus = "degraded";
        logActivity(
          state,
          bus,
          "equipment",
          `${eq.name} condition dropped below ${MAINTENANCE_CONFIG.degradedConditionThreshold}%.`,
          "warning",
          eq.id,
        );
      }
      if (eq.condition <= 0) {
        eq.currentStatus = "failed";
        logActivity(state, bus, "equipment", `${eq.name} broke down and needs repair.`, "critical", eq.id);
      }
    }
  }
}

/** Per-minute chance of a degraded unit failing outright while the bar is open ("may fail completely during service", Section 34). */
export function processEquipmentWear(state: GameState, prop: OwnedPropertyState, rng: SeededRandom, bus: EventBus): void {
  for (const eq of prop.equipment) {
    if (eq.currentStatus !== "degraded") continue;
    const chance = degradedSeverity(prop, eq.category) * MAINTENANCE_CONFIG.maxPerMinuteBreakdownChance;
    if (rng.chance(chance)) {
      eq.currentStatus = "failed";
      logActivity(state, bus, "equipment", `${eq.name} broke down and needs repair.`, "critical", eq.id);
      bus.emit("equipment:failed", { equipment: eq });
    }
  }
}

/** Auto-queues a repair_equipment task per failed item once a maintenance employee is on staff (same shape as cleaning.ensureCleaningTasks). */
export function ensureMaintenanceTasks(state: GameState, prop: OwnedPropertyState, bus: EventBus): void {
  const hasMaintenanceStaff = prop.employees.some((e) => e.role === "maintenance");
  if (!hasMaintenanceStaff) return;

  // Inlined rather than imported from maintenanceToolEffects.ts to avoid a circular import (that
  // file imports isEquipmentUsable from this one) — see maintenanceToolEffects.ts for the shared,
  // testable version of this same check used elsewhere.
  const hasMaintenanceTool = prop.equipment.some((e) => e.category === "maintenance_tool" && isEquipmentUsable(e));
  const repairDuration = Math.round(
    MAINTENANCE_CONFIG.employeeRepairBaseDurationMinutes * (hasMaintenanceTool ? MAINTENANCE_CONFIG.maintenanceToolDurationMultiplier : 1),
  );

  for (const eq of prop.equipment) {
    if (eq.currentStatus !== "failed") continue;
    const hasPendingRepairTask = prop.tasks.some(
      (t) => t.type === "repair_equipment" && t.equipmentId === eq.id && t.status !== "complete" && t.status !== "cancelled",
    );
    if (hasPendingRepairTask) continue;

    eq.currentStatus = "awaiting_repair";
    prop.tasks.push(
      createServiceTask({
        type: "repair_equipment",
        eligibleRoles: rolesFor("repair_equipment"),
        requiredSkill: "accuracy",
        durationGameMinutes: repairDuration,
        equipmentId: eq.id,
        createdAtGameMinute: state.gameMinute,
      }),
    );
    logActivity(state, bus, "equipment", `A repair was queued for ${eq.name}.`, "info", eq.id);
  }
}

/** Resolves any contract repairs whose delay has elapsed, called from dayCycle.openDay (mirrors deliverDuePurchaseOrders). */
export function resolveDueContractRepairs(state: GameState, prop: OwnedPropertyState, bus: EventBus): void {
  for (const eq of prop.equipment) {
    if (eq.contractRepairDueGameDay === undefined || state.gameDay < eq.contractRepairDueGameDay) continue;

    eq.condition = MAINTENANCE_CONFIG.conditionAfterRepair;
    eq.currentStatus = "operational";
    eq.repairHistory.push({
      gameDay: state.gameDay,
      gameMinute: state.gameMinute,
      method: "contract",
      costCents: MAINTENANCE_CONFIG.contractRepairCostCents,
    });
    eq.contractRepairDueGameDay = undefined;

    logActivity(state, bus, "equipment", `A contractor repaired ${eq.name}.`, "info", eq.id);
  }
}

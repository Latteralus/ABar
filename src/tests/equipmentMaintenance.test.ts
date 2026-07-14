import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { MAINTENANCE_CONFIG } from "@/config/maintenanceConfig";
import { getEquipmentCatalogEntry } from "@/data/equipment/equipmentCatalog";
import {
  applyDailyEquipmentWear,
  decayEquipmentOnUse,
  ensureMaintenanceTasks,
  equipmentSpeedMultiplier,
  equipmentWasteMultiplier,
  isEquipmentUsable,
  processEquipmentWear,
  resolveDueContractRepairs,
} from "@/simulation/engine/equipmentMaintenance";
import { hasRequiredEquipment } from "@/simulation/engine/orderProcessing";
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { Equipment, GameState, OwnedPropertyState } from "@/types";

function setup(): { state: GameState; prop: OwnedPropertyState; bus: EventBus } {
  const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
  return { state, prop: activeProperty(state), bus: new EventBus() };
}

function barStation(prop: OwnedPropertyState): Equipment {
  return prop.equipment.find((e) => e.category === "bar_station")!;
}

describe("applyDailyEquipmentWear", () => {
  it("decays condition by the daily flat rate", () => {
    const { state, prop, bus } = setup();
    const before = barStation(prop).condition;
    applyDailyEquipmentWear(state, prop, bus);
    expect(barStation(prop).condition).toBeCloseTo(before - MAINTENANCE_CONFIG.dailyConditionDecay, 5);
  });

  it("transitions to degraded and logs once condition crosses the threshold", () => {
    const { state, prop, bus } = setup();
    const eq = barStation(prop);
    eq.condition = MAINTENANCE_CONFIG.degradedConditionThreshold + 0.5;

    applyDailyEquipmentWear(state, prop, bus);

    expect(eq.currentStatus).toBe("degraded");
    expect(state.activityLog.some((e) => e.category === "equipment" && /condition dropped below/.test(e.message))).toBe(true);
  });

  it("fails equipment outright once condition reaches zero", () => {
    const { state, prop, bus } = setup();
    const eq = barStation(prop);
    eq.condition = MAINTENANCE_CONFIG.dailyConditionDecay / 2;

    applyDailyEquipmentWear(state, prop, bus);

    expect(eq.condition).toBe(0);
    expect(eq.currentStatus).toBe("failed");
    expect(state.activityLog.some((e) => e.severity === "critical" && e.relatedEntityId === eq.id)).toBe(true);
  });

  it("does not keep wearing down equipment that's already failed", () => {
    const { state, prop, bus } = setup();
    const eq = barStation(prop);
    eq.condition = 0;
    eq.currentStatus = "failed";

    applyDailyEquipmentWear(state, prop, bus);

    expect(eq.condition).toBe(0);
  });
});

describe("decayEquipmentOnUse", () => {
  it("wears only usable equipment in the matching category", () => {
    const { prop } = setup();
    const eq = barStation(prop);
    const before = eq.condition;

    decayEquipmentOnUse(prop, "bar_station");
    expect(eq.condition).toBeCloseTo(before - MAINTENANCE_CONFIG.usageConditionDecayPerTask, 5);

    decayEquipmentOnUse(prop, "refrigerator"); // different category — bar_station untouched further
    expect(eq.condition).toBeCloseTo(before - MAINTENANCE_CONFIG.usageConditionDecayPerTask, 5);
  });

  it("does not wear equipment that is already failed", () => {
    const { prop } = setup();
    const eq = barStation(prop);
    eq.currentStatus = "failed";
    const before = eq.condition;

    decayEquipmentOnUse(prop, "bar_station");
    expect(eq.condition).toBe(before);
  });
});

describe("processEquipmentWear", () => {
  it("can fail a degraded unit when the roll succeeds, using the seeded RNG", () => {
    const { state, prop, bus } = setup();
    const eq = barStation(prop);
    eq.condition = 10;
    eq.currentStatus = "degraded";
    const alwaysBreaks = { chance: () => true } as unknown as SeededRandom;

    processEquipmentWear(state, prop, alwaysBreaks, bus);

    expect(eq.currentStatus).toBe("failed");
  });

  it("leaves a degraded unit alone when the roll fails", () => {
    const { state, prop, bus } = setup();
    const eq = barStation(prop);
    eq.condition = 10;
    eq.currentStatus = "degraded";
    const neverBreaks = { chance: () => false } as unknown as SeededRandom;

    processEquipmentWear(state, prop, neverBreaks, bus);

    expect(eq.currentStatus).toBe("degraded");
  });

  it("never rolls for operational equipment", () => {
    const { state, prop, bus } = setup();
    const eq = barStation(prop);
    eq.currentStatus = "operational";
    const alwaysBreaks = { chance: () => true } as unknown as SeededRandom;

    processEquipmentWear(state, prop, alwaysBreaks, bus);

    expect(eq.currentStatus).toBe("operational");
  });
});

describe("equipment-condition performance multipliers", () => {
  it("apply no penalty above the degraded threshold", () => {
    const { prop } = setup();
    expect(equipmentSpeedMultiplier(prop, "bar_station")).toBe(1);
    expect(equipmentWasteMultiplier(prop, "bar_station")).toBe(1);
  });

  it("apply a growing penalty as the healthiest usable unit's condition drops", () => {
    const { prop } = setup();
    barStation(prop).condition = 1;
    barStation(prop).currentStatus = "degraded";

    expect(equipmentSpeedMultiplier(prop, "bar_station")).toBeGreaterThan(1);
    expect(equipmentWasteMultiplier(prop, "bar_station")).toBeGreaterThan(1);
  });

  it("returns 1 (no effect) for an undefined category", () => {
    const { prop } = setup();
    expect(equipmentSpeedMultiplier(prop, undefined)).toBe(1);
  });
});

describe("speedRating multiplier", () => {
  it("stays neutral (1x) for starter equipment, whose speedRating already matches the baseline", () => {
    const { prop } = setup();
    // Starter bar_station's speedRating is 50, the same as MAINTENANCE_CONFIG.baselineSpeedRating,
    // so day-1 behavior must be unchanged by this feature.
    expect(barStation(prop).speedRating).toBe(MAINTENANCE_CONFIG.baselineSpeedRating);
    expect(equipmentSpeedMultiplier(prop, "bar_station")).toBe(1);
  });

  it("a higher speedRating makes tasks faster (a lower multiplier) at full condition", () => {
    const { prop } = setup();
    const premium = getEquipmentCatalogEntry("equip-bar-station-premium");
    expect(premium.speedRating).toBeGreaterThan(MAINTENANCE_CONFIG.baselineSpeedRating);

    barStation(prop).speedRating = premium.speedRating;

    expect(equipmentSpeedMultiplier(prop, "bar_station")).toBeLessThan(1);
  });

  it("a lower speedRating makes tasks slower (a higher multiplier)", () => {
    const { prop } = setup();
    barStation(prop).speedRating = 40; // e.g. a microwave, below the 50 baseline

    expect(equipmentSpeedMultiplier(prop, "bar_station")).toBeGreaterThan(1);
  });

  it("a second, worse unit of the same category doesn't drag down the best one's rating", () => {
    const { prop } = setup();
    const before = equipmentSpeedMultiplier(prop, "bar_station");
    prop.equipment.push({ ...barStation(prop), id: "equip-second-bar-station", speedRating: 10 });

    expect(equipmentSpeedMultiplier(prop, "bar_station")).toBe(before);
  });
});

describe("hasRequiredEquipment", () => {
  it("blocks a product once its only matching equipment has failed", () => {
    const { prop } = setup();
    expect(hasRequiredEquipment(prop, "prod-cola")).toBe(true);
    barStation(prop).currentStatus = "failed";
    expect(hasRequiredEquipment(prop, "prod-cola")).toBe(false);
  });

  it("stays usable if a second unit of the category is still healthy", () => {
    const { prop } = setup();
    barStation(prop).currentStatus = "failed";
    prop.equipment.push({ ...barStation(prop), id: "equip-second-bar-station", currentStatus: "operational" });
    expect(hasRequiredEquipment(prop, "prod-cola")).toBe(true);
  });
});

describe("ensureMaintenanceTasks", () => {
  it("does nothing without a maintenance employee on staff", () => {
    const { state, prop, bus } = setup();
    barStation(prop).currentStatus = "failed";

    ensureMaintenanceTasks(state, prop, bus);

    expect(prop.tasks).toHaveLength(0);
    expect(barStation(prop).currentStatus).toBe("failed");
  });

  it("auto-queues a repair_equipment task and flips the item to awaiting_repair once maintenance is hired", () => {
    const { state, prop, bus } = setup();
    const eq = barStation(prop);
    eq.currentStatus = "failed";
    prop.employees.push({
      id: "emp-maint",
      firstName: "Pat",
      lastName: "Fix",
      role: "maintenance",
      wagePerShiftCents: 10000,
      personality: [],
      skills: {
        bartending: 50,
        serving: 50,
        cooking: 50,
        speed: 50,
        accuracy: 50,
        charisma: 50,
        cleanliness: 50,
        security: 50,
        management: 50,
      },
      shiftsWorked: 0,
      hiredAtGameMinute: 0,
      currentTaskId: null,
      status: "idle",
      performance: { customersServed: 0, itemsPrepared: 0, ordersFulfilled: 0, wasteGeneratedCents: 0, tipsEarnedCents: 0 },
    });

    ensureMaintenanceTasks(state, prop, bus);

    expect(eq.currentStatus).toBe("awaiting_repair");
    const task = prop.tasks.find((t) => t.type === "repair_equipment" && t.equipmentId === eq.id);
    expect(task).toBeTruthy();
    expect(task?.eligibleRoles).toEqual(["maintenance"]);

    ensureMaintenanceTasks(state, prop, bus); // second pass shouldn't double-queue
    expect(prop.tasks.filter((t) => t.type === "repair_equipment")).toHaveLength(1);
  });

  it("queues a shorter repair task when an operational maintenance_tool is owned", () => {
    const { state, prop, bus } = setup();
    barStation(prop).currentStatus = "failed";
    prop.employees.push({
      id: "emp-maint",
      firstName: "Pat",
      lastName: "Fix",
      role: "maintenance",
      wagePerShiftCents: 10000,
      personality: [],
      skills: {
        bartending: 50,
        serving: 50,
        cooking: 50,
        speed: 50,
        accuracy: 50,
        charisma: 50,
        cleanliness: 50,
        security: 50,
        management: 50,
      },
      shiftsWorked: 0,
      hiredAtGameMinute: 0,
      currentTaskId: null,
      status: "idle",
      performance: { customersServed: 0, itemsPrepared: 0, ordersFulfilled: 0, wasteGeneratedCents: 0, tipsEarnedCents: 0 },
    });
    prop.equipment.push({
      id: "equip-tool-kit",
      name: "Maintenance Tool Kit",
      category: "maintenance_tool",
      purchasePrice: 750_00,
      speedRating: 55,
      spaceUnits: 4,
      tier: 1,
      condition: 100,
      currentStatus: "operational",
      repairHistory: [],
    });

    ensureMaintenanceTasks(state, prop, bus);

    const task = prop.tasks.find((t) => t.type === "repair_equipment");
    expect(task?.durationGameMinutes).toBe(
      Math.round(MAINTENANCE_CONFIG.employeeRepairBaseDurationMinutes * MAINTENANCE_CONFIG.maintenanceToolDurationMultiplier),
    );
  });
});

describe("contract repair", () => {
  it("requestContractRepair rejects equipment that isn't failed", () => {
    const { state, prop, bus } = setup();
    const result = commandService.requestContractRepair(state, bus, barStation(prop).id);
    expect(result.success).toBe(false);
  });

  it("charges cash, posts opex_contract_repair, and schedules resolution", () => {
    const { state, prop, bus } = setup();
    const eq = barStation(prop);
    eq.currentStatus = "failed";
    const cashBefore = state.cash;

    const result = commandService.requestContractRepair(state, bus, eq.id);

    expect(result.success).toBe(true);
    expect(state.cash).toBe(cashBefore - MAINTENANCE_CONFIG.contractRepairCostCents);
    expect(state.ledger.some((l) => l.category === "opex_contract_repair" && l.amount === MAINTENANCE_CONFIG.contractRepairCostCents)).toBe(
      true,
    );
    expect(eq.currentStatus).toBe("awaiting_repair");
    expect(eq.contractRepairDueGameDay).toBe(state.gameDay + MAINTENANCE_CONFIG.contractRepairDelayDays);
  });

  it("resolveDueContractRepairs repairs equipment once the due day arrives, not before", () => {
    const { state, prop, bus } = setup();
    const eq = barStation(prop);
    eq.currentStatus = "awaiting_repair";
    eq.contractRepairDueGameDay = state.gameDay + 1;

    resolveDueContractRepairs(state, prop, bus);
    expect(eq.currentStatus).toBe("awaiting_repair"); // not due yet

    state.gameDay += 1;
    resolveDueContractRepairs(state, prop, bus);

    expect(eq.currentStatus).toBe("operational");
    expect(eq.condition).toBe(MAINTENANCE_CONFIG.conditionAfterRepair);
    expect(eq.contractRepairDueGameDay).toBeUndefined();
    expect(eq.repairHistory).toHaveLength(1);
    expect(eq.repairHistory[0].method).toBe("contract");
  });
});

describe("isEquipmentUsable", () => {
  it("is true only for operational/degraded", () => {
    const base = barStation(activeProperty(createNewGameState({ saveName: "t", acquisitionType: "lease", acceptLoan: false })));
    expect(isEquipmentUsable({ ...base, currentStatus: "operational" })).toBe(true);
    expect(isEquipmentUsable({ ...base, currentStatus: "degraded" })).toBe(true);
    expect(isEquipmentUsable({ ...base, currentStatus: "failed" })).toBe(false);
    expect(isEquipmentUsable({ ...base, currentStatus: "awaiting_repair" })).toBe(false);
    expect(isEquipmentUsable({ ...base, currentStatus: "under_repair" })).toBe(false);
  });
});

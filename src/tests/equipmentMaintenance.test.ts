import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { MAINTENANCE_CONFIG } from "@/config/maintenanceConfig";
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
import type { Equipment, GameState } from "@/types";

function setup(): { state: GameState; bus: EventBus } {
  return { state: createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false }), bus: new EventBus() };
}

function barStation(state: GameState): Equipment {
  return state.equipment.find((e) => e.category === "bar_station")!;
}

describe("applyDailyEquipmentWear", () => {
  it("decays condition by the daily flat rate", () => {
    const { state, bus } = setup();
    const before = barStation(state).condition;
    applyDailyEquipmentWear(state, bus);
    expect(barStation(state).condition).toBeCloseTo(before - MAINTENANCE_CONFIG.dailyConditionDecay, 5);
  });

  it("transitions to degraded and logs once condition crosses the threshold", () => {
    const { state, bus } = setup();
    const eq = barStation(state);
    eq.condition = MAINTENANCE_CONFIG.degradedConditionThreshold + 0.5;

    applyDailyEquipmentWear(state, bus);

    expect(eq.currentStatus).toBe("degraded");
    expect(state.activityLog.some((e) => e.category === "equipment" && /condition dropped below/.test(e.message))).toBe(true);
  });

  it("fails equipment outright once condition reaches zero", () => {
    const { state, bus } = setup();
    const eq = barStation(state);
    eq.condition = MAINTENANCE_CONFIG.dailyConditionDecay / 2;

    applyDailyEquipmentWear(state, bus);

    expect(eq.condition).toBe(0);
    expect(eq.currentStatus).toBe("failed");
    expect(state.activityLog.some((e) => e.severity === "critical" && e.relatedEntityId === eq.id)).toBe(true);
  });

  it("does not keep wearing down equipment that's already failed", () => {
    const { state, bus } = setup();
    const eq = barStation(state);
    eq.condition = 0;
    eq.currentStatus = "failed";

    applyDailyEquipmentWear(state, bus);

    expect(eq.condition).toBe(0);
  });
});

describe("decayEquipmentOnUse", () => {
  it("wears only usable equipment in the matching category", () => {
    const { state } = setup();
    const eq = barStation(state);
    const before = eq.condition;

    decayEquipmentOnUse(state, "bar_station");
    expect(eq.condition).toBeCloseTo(before - MAINTENANCE_CONFIG.usageConditionDecayPerTask, 5);

    decayEquipmentOnUse(state, "refrigerator"); // different category — bar_station untouched further
    expect(eq.condition).toBeCloseTo(before - MAINTENANCE_CONFIG.usageConditionDecayPerTask, 5);
  });

  it("does not wear equipment that is already failed", () => {
    const { state } = setup();
    const eq = barStation(state);
    eq.currentStatus = "failed";
    const before = eq.condition;

    decayEquipmentOnUse(state, "bar_station");
    expect(eq.condition).toBe(before);
  });
});

describe("processEquipmentWear", () => {
  it("can fail a degraded unit when the roll succeeds, using the seeded RNG", () => {
    const { state, bus } = setup();
    const eq = barStation(state);
    eq.condition = 10;
    eq.currentStatus = "degraded";
    const alwaysBreaks = { chance: () => true } as unknown as SeededRandom;

    processEquipmentWear(state, alwaysBreaks, bus);

    expect(eq.currentStatus).toBe("failed");
  });

  it("leaves a degraded unit alone when the roll fails", () => {
    const { state, bus } = setup();
    const eq = barStation(state);
    eq.condition = 10;
    eq.currentStatus = "degraded";
    const neverBreaks = { chance: () => false } as unknown as SeededRandom;

    processEquipmentWear(state, neverBreaks, bus);

    expect(eq.currentStatus).toBe("degraded");
  });

  it("never rolls for operational equipment", () => {
    const { state, bus } = setup();
    const eq = barStation(state);
    eq.currentStatus = "operational";
    const alwaysBreaks = { chance: () => true } as unknown as SeededRandom;

    processEquipmentWear(state, alwaysBreaks, bus);

    expect(eq.currentStatus).toBe("operational");
  });
});

describe("equipment-condition performance multipliers", () => {
  it("apply no penalty above the degraded threshold", () => {
    const { state } = setup();
    expect(equipmentSpeedMultiplier(state, "bar_station")).toBe(1);
    expect(equipmentWasteMultiplier(state, "bar_station")).toBe(1);
  });

  it("apply a growing penalty as the healthiest usable unit's condition drops", () => {
    const { state } = setup();
    barStation(state).condition = 1;
    barStation(state).currentStatus = "degraded";

    expect(equipmentSpeedMultiplier(state, "bar_station")).toBeGreaterThan(1);
    expect(equipmentWasteMultiplier(state, "bar_station")).toBeGreaterThan(1);
  });

  it("returns 1 (no effect) for an undefined category", () => {
    const { state } = setup();
    expect(equipmentSpeedMultiplier(state, undefined)).toBe(1);
  });
});

describe("hasRequiredEquipment", () => {
  it("blocks a product once its only matching equipment has failed", () => {
    const { state } = setup();
    expect(hasRequiredEquipment(state, "prod-cola")).toBe(true);
    barStation(state).currentStatus = "failed";
    expect(hasRequiredEquipment(state, "prod-cola")).toBe(false);
  });

  it("stays usable if a second unit of the category is still healthy", () => {
    const { state } = setup();
    barStation(state).currentStatus = "failed";
    state.equipment.push({ ...barStation(state), id: "equip-second-bar-station", currentStatus: "operational" });
    expect(hasRequiredEquipment(state, "prod-cola")).toBe(true);
  });
});

describe("ensureMaintenanceTasks", () => {
  it("does nothing without a maintenance employee on staff", () => {
    const { state, bus } = setup();
    barStation(state).currentStatus = "failed";

    ensureMaintenanceTasks(state, bus);

    expect(state.tasks).toHaveLength(0);
    expect(barStation(state).currentStatus).toBe("failed");
  });

  it("auto-queues a repair_equipment task and flips the item to awaiting_repair once maintenance is hired", () => {
    const { state, bus } = setup();
    const eq = barStation(state);
    eq.currentStatus = "failed";
    state.employees.push({
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

    ensureMaintenanceTasks(state, bus);

    expect(eq.currentStatus).toBe("awaiting_repair");
    const task = state.tasks.find((t) => t.type === "repair_equipment" && t.equipmentId === eq.id);
    expect(task).toBeTruthy();
    expect(task?.eligibleRoles).toEqual(["maintenance"]);

    ensureMaintenanceTasks(state, bus); // second pass shouldn't double-queue
    expect(state.tasks.filter((t) => t.type === "repair_equipment")).toHaveLength(1);
  });
});

describe("contract repair", () => {
  it("requestContractRepair rejects equipment that isn't failed", () => {
    const { state, bus } = setup();
    const result = commandService.requestContractRepair(state, bus, barStation(state).id);
    expect(result.success).toBe(false);
  });

  it("charges cash, posts opex_contract_repair, and schedules resolution", () => {
    const { state, bus } = setup();
    const eq = barStation(state);
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
    const { state, bus } = setup();
    const eq = barStation(state);
    eq.currentStatus = "awaiting_repair";
    eq.contractRepairDueGameDay = state.gameDay + 1;

    resolveDueContractRepairs(state, bus);
    expect(eq.currentStatus).toBe("awaiting_repair"); // not due yet

    state.gameDay += 1;
    resolveDueContractRepairs(state, bus);

    expect(eq.currentStatus).toBe("operational");
    expect(eq.condition).toBe(MAINTENANCE_CONFIG.conditionAfterRepair);
    expect(eq.contractRepairDueGameDay).toBeUndefined();
    expect(eq.repairHistory).toHaveLength(1);
    expect(eq.repairHistory[0].method).toBe("contract");
  });
});

describe("isEquipmentUsable", () => {
  it("is true only for operational/degraded", () => {
    const base = barStation({ ...createNewGameState({ saveName: "t", acquisitionType: "lease", acceptLoan: false }) });
    expect(isEquipmentUsable({ ...base, currentStatus: "operational" })).toBe(true);
    expect(isEquipmentUsable({ ...base, currentStatus: "degraded" })).toBe(true);
    expect(isEquipmentUsable({ ...base, currentStatus: "failed" })).toBe(false);
    expect(isEquipmentUsable({ ...base, currentStatus: "awaiting_repair" })).toBe(false);
    expect(isEquipmentUsable({ ...base, currentStatus: "under_repair" })).toBe(false);
  });
});

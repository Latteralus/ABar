import { beforeEach, describe, expect, it } from "vitest";
import { saveService } from "@/services/saveService";
import { createNewGameState } from "@/services/newGameService";
import { SAVE_CONFIG } from "@/config/gameConfig";
import { activeProperty } from "@/simulation/engine/activeProperty";

describe("saveService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a game state through save and load", () => {
    const original = createNewGameState({ saveName: "Round Trip", acquisitionType: "buy", acceptLoan: true });
    original.cash = 123456;
    original.gameDay = 3;

    saveService.save(original);
    const loaded = saveService.load(original.saveId);

    expect(loaded).not.toBeNull();
    expect(loaded?.saveId).toBe(original.saveId);
    expect(loaded?.cash).toBe(123456);
    expect(loaded?.gameDay).toBe(3);
    expect(loaded?.rngSeed).toBe(original.rngSeed);
  });

  it("lists saved games in the save index", () => {
    const first = createNewGameState({ saveName: "Alpha", acquisitionType: "lease", acceptLoan: false });
    const second = createNewGameState({ saveName: "Beta", acquisitionType: "lease", acceptLoan: false });
    saveService.save(first);
    saveService.save(second);

    const list = saveService.list();
    expect(list.map((s) => s.saveName).sort()).toEqual(["Alpha", "Beta"]);
  });

  it("removes a save from storage and the index on delete", () => {
    const state = createNewGameState({ saveName: "Temp", acquisitionType: "lease", acceptLoan: false });
    saveService.save(state);
    saveService.delete(state.saveId);

    expect(saveService.load(state.saveId)).toBeNull();
    expect(saveService.list().find((s) => s.saveId === state.saveId)).toBeUndefined();
  });

  it("backfills currentStatus/repairHistory on equipment from a pre-Stage-4 (v3) save", () => {
    const state = createNewGameState({ saveName: "Old Save", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    // Simulate a save written before Stage 4 added these fields, and before v10 (Real Estate)
    // moved every property-specific field off the top-level state onto a per-property bundle —
    // i.e. the flat shape a v3 save actually had on disk.
    const equipmentWithoutStatus = prop.equipment.map(
      ({ currentStatus: _currentStatus, repairHistory: _repairHistory, ...rest }) => rest,
    );
    const legacyState: Record<string, unknown> = { ...state };
    delete legacyState.properties;
    delete legacyState.activePropertyId;
    Object.assign(legacyState, {
      propertyId: prop.propertyId,
      employees: prop.employees,
      customers: prop.customers,
      customerGroups: prop.customerGroups,
      inventory: prop.inventory,
      purchaseOrders: prop.purchaseOrders,
      equipment: equipmentWithoutStatus,
      attractions: prop.attractions,
      menu: prop.menu,
      barCleanliness: prop.barCleanliness,
      tabs: prop.tabs,
      receipts: prop.receipts,
      tasks: prop.tasks,
      orders: prop.orders,
      reputation: prop.reputation,
      reviews: prop.reviews,
      activePromotions: prop.activePromotions,
      dailyReports: prop.dailyReports,
      bills: [...state.bills, ...prop.bills],
    });

    const rawEnvelope = { version: 3, savedAtIso: new Date().toISOString(), state: legacyState };
    window.localStorage.setItem(`${SAVE_CONFIG.localStorageKeyPrefix}${state.saveId}`, JSON.stringify(rawEnvelope));

    const loaded = saveService.load(state.saveId);

    expect(loaded).not.toBeNull();
    const loadedProp = activeProperty(loaded!);
    for (const equipment of loadedProp.equipment) {
      expect(equipment.currentStatus).toBe("operational");
      expect(equipment.repairHistory).toEqual([]);
    }
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { saveService } from "@/services/saveService";
import { createNewGameState } from "@/services/newGameService";
import { SAVE_CONFIG } from "@/config/gameConfig";

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
    // Simulate a save written before Stage 4 added these fields.
    state.equipment = state.equipment.map(({ currentStatus: _currentStatus, repairHistory: _repairHistory, ...rest }) => rest) as typeof state.equipment;
    const rawEnvelope = { version: 3, savedAtIso: new Date().toISOString(), state };
    window.localStorage.setItem(`${SAVE_CONFIG.localStorageKeyPrefix}${state.saveId}`, JSON.stringify(rawEnvelope));

    const loaded = saveService.load(state.saveId);

    expect(loaded).not.toBeNull();
    for (const equipment of loaded!.equipment) {
      expect(equipment.currentStatus).toBe("operational");
      expect(equipment.repairHistory).toEqual([]);
    }
  });
});

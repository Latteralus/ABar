import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { ensureCleaningTasks } from "@/simulation/engine/cleaning";
import { CLEANLINESS_CONFIG } from "@/config/facilityConfig";

describe("ensureCleaningTasks", () => {
  it("does nothing while cleanliness is above the trigger threshold", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.barCleanliness = CLEANLINESS_CONFIG.taskTriggerThreshold + 1;

    ensureCleaningTasks(state);

    expect(state.tasks).toHaveLength(0);
  });

  it("queues a clean_bar task once cleanliness drops below the trigger threshold", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.barCleanliness = CLEANLINESS_CONFIG.taskTriggerThreshold - 1;

    ensureCleaningTasks(state);

    const task = state.tasks.find((t) => t.type === "clean_bar");
    expect(task).toBeTruthy();
    expect(task?.priority).toBe(3);
    expect(task?.eligibleRoles).toEqual(expect.arrayContaining(["bartender", "server", "barback", "host", "dishwasher"]));
  });

  it("does not queue a second clean_bar task while one is already pending", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.barCleanliness = CLEANLINESS_CONFIG.taskTriggerThreshold - 1;

    ensureCleaningTasks(state);
    ensureCleaningTasks(state);

    expect(state.tasks.filter((t) => t.type === "clean_bar")).toHaveLength(1);
  });
});

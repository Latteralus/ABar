import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { ensureCleaningTasks } from "@/simulation/engine/cleaning";
import { CLEANLINESS_CONFIG } from "@/config/facilityConfig";
import { activeProperty } from "@/simulation/engine/activeProperty";

describe("ensureCleaningTasks", () => {
  it("does nothing while cleanliness is above the trigger threshold", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    prop.barCleanliness = CLEANLINESS_CONFIG.taskTriggerThreshold + 1;

    ensureCleaningTasks(state, prop);

    expect(prop.tasks).toHaveLength(0);
  });

  it("queues a clean_bar task once cleanliness drops below the trigger threshold", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    prop.barCleanliness = CLEANLINESS_CONFIG.taskTriggerThreshold - 1;

    ensureCleaningTasks(state, prop);

    const task = prop.tasks.find((t) => t.type === "clean_bar");
    expect(task).toBeTruthy();
    expect(task?.priority).toBe(3);
    expect(task?.eligibleRoles).toEqual(expect.arrayContaining(["bartender", "server", "barback", "host", "dishwasher"]));
  });

  it("does not queue a second clean_bar task while one is already pending", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    prop.barCleanliness = CLEANLINESS_CONFIG.taskTriggerThreshold - 1;

    ensureCleaningTasks(state, prop);
    ensureCleaningTasks(state, prop);

    expect(prop.tasks.filter((t) => t.type === "clean_bar")).toHaveLength(1);
  });
});

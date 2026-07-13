import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { generateStaffIdleFlavor } from "@/simulation/engine/staffIdleFlavor";
import type { Employee } from "@/types";

function makeEmployee(role: Employee["role"], overrides: Partial<Employee> = {}): Employee {
  return {
    id: `emp-${role}`,
    firstName: "Staff",
    lastName: role,
    role,
    wagePerShiftCents: 10000,
    personality: [],
    skills: { bartending: 50, serving: 50, cooking: 50, speed: 50, accuracy: 50, charisma: 50, cleanliness: 50, security: 50, management: 50 },
    shiftsWorked: 0,
    hiredAtGameMinute: 0,
    currentTaskId: null,
    status: "idle",
    performance: { customersServed: 0, itemsPrepared: 0, ordersFulfilled: 0, wasteGeneratedCents: 0, tipsEarnedCents: 0 },
    ...overrides,
  };
}

const alwaysChance = { chance: () => true, pick: <T,>(arr: readonly T[]) => arr[0] } as unknown as SeededRandom;
const neverChance = { chance: () => false, pick: <T,>(arr: readonly T[]) => arr[0] } as unknown as SeededRandom;

describe("generateStaffIdleFlavor", () => {
  it("logs a flavor line for an idle bartender", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.employees.push(makeEmployee("bartender"));
    const bus = new EventBus();

    generateStaffIdleFlavor(state, alwaysChance, bus);

    expect(state.activityLog.some((e) => e.category === "employee")).toBe(true);
  });

  it("does nothing for an employee currently on a task", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.employees.push(makeEmployee("bartender", { status: "preparing_drink", currentTaskId: "task-1" }));
    const bus = new EventBus();

    generateStaffIdleFlavor(state, alwaysChance, bus);

    expect(state.activityLog.some((e) => e.category === "employee")).toBe(false);
  });

  it("does nothing for a role with no idle-flavor templates (e.g. security)", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.employees.push(makeEmployee("security"));
    const bus = new EventBus();

    generateStaffIdleFlavor(state, alwaysChance, bus);

    expect(state.activityLog.some((e) => e.category === "employee")).toBe(false);
  });

  it("respects the roll and stays silent when chance doesn't favor it", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.employees.push(makeEmployee("server"));
    const bus = new EventBus();

    generateStaffIdleFlavor(state, neverChance, bus);

    expect(state.activityLog.some((e) => e.category === "employee")).toBe(false);
  });
});

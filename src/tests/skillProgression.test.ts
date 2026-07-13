import { describe, expect, it } from "vitest";
import { applyShiftProgression } from "@/simulation/engine/skillProgression";
import type { Employee } from "@/types";

function makeBartender(overrides: Partial<Employee["performance"]> = {}): Employee {
  return {
    id: "emp-test",
    firstName: "Test",
    lastName: "Bartender",
    role: "bartender",
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
    performance: { customersServed: 0, itemsPrepared: 0, ordersFulfilled: 0, wasteGeneratedCents: 0, tipsEarnedCents: 0, ...overrides },
  };
}

describe("applyShiftProgression", () => {
  it("increments shiftsWorked every time it's applied", () => {
    const employee = makeBartender();
    applyShiftProgression(employee);
    expect(employee.shiftsWorked).toBe(1);
    applyShiftProgression(employee);
    expect(employee.shiftsWorked).toBe(2);
  });

  it("grows the bartender's primary skills (bartending, speed, accuracy), not unrelated ones", () => {
    const employee = makeBartender({ itemsPrepared: 10 });
    const before = { ...employee.skills };
    applyShiftProgression(employee);

    expect(employee.skills.bartending).toBeGreaterThan(before.bartending);
    expect(employee.skills.speed).toBeGreaterThan(before.speed);
    expect(employee.skills.accuracy).toBeGreaterThan(before.accuracy);
    // Management isn't a bartender-primary skill and shouldn't move.
    expect(employee.skills.management).toBe(before.management);
  });

  it("never pushes a skill above 100", () => {
    const employee = makeBartender({ itemsPrepared: 500 });
    employee.skills.bartending = 99.9;
    for (let i = 0; i < 50; i++) applyShiftProgression(employee);
    expect(employee.skills.bartending).toBeLessThanOrEqual(100);
  });

  it("does not make an employee highly skilled after only a few shifts", () => {
    const employee = makeBartender({ itemsPrepared: 3 });
    for (let i = 0; i < 5; i++) applyShiftProgression(employee);
    expect(employee.skills.bartending).toBeLessThan(60);
  });
});

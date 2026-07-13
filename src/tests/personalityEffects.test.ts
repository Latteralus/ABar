import { describe, expect, it } from "vitest";
import {
  hasCalmBonus,
  personalitySatisfactionBonus,
  personalitySpeedMultiplier,
  personalityWasteMultiplier,
} from "@/simulation/engine/personalityEffects";
import type { Employee, PersonalityTrait } from "@/types";

function makeEmployee(personality: PersonalityTrait[]): Employee {
  return {
    id: "emp-test",
    firstName: "Test",
    lastName: "Employee",
    role: "bartender",
    wagePerShiftCents: 10000,
    personality,
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
  };
}

describe("personalityEffects", () => {
  it("returns neutral modifiers for an employee with no traits", () => {
    const employee = makeEmployee([]);
    expect(personalitySpeedMultiplier(employee)).toBe(1);
    expect(personalityWasteMultiplier(employee)).toBe(1);
    expect(personalitySatisfactionBonus(employee)).toBe(0);
    expect(hasCalmBonus(employee)).toBe(false);
  });

  it("makes an efficient employee faster than base", () => {
    const employee = makeEmployee(["efficient"]);
    expect(personalitySpeedMultiplier(employee)).toBeLessThan(1);
  });

  it("makes a careless employee waste more than base", () => {
    const employee = makeEmployee(["careless"]);
    expect(personalityWasteMultiplier(employee)).toBeGreaterThan(1);
  });

  it("stacks multiple traits' satisfaction bonuses additively", () => {
    const friendly = personalitySatisfactionBonus(makeEmployee(["friendly"]));
    const both = personalitySatisfactionBonus(makeEmployee(["friendly", "charismatic"]));
    expect(both).toBeGreaterThan(friendly);
  });

  it("flags calm employees for the intoxication-removal cooperate bonus", () => {
    expect(hasCalmBonus(makeEmployee(["calm"]))).toBe(true);
    expect(hasCalmBonus(makeEmployee(["abrasive"]))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { hasOperationalTv, shouldOrderWhileWatchingTv } from "@/simulation/engine/tvEffects";
import { advanceCustomers } from "@/simulation/engine/customerLifecycle";
import { describeEquipmentBenefit } from "@/data/equipment/equipmentCatalog";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Customer } from "@/types";

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    firstName: "Alex",
    lastName: "Kim",
    archetypeId: "archetype-regular",
    ageGroup: "adult",
    incomeLevel: "middle",
    spendingBudget: 5_000,
    preferredCategories: [],
    priceSensitivity: 50,
    patience: 50,
    reviewTendency: 0,
    reorderTendency: 50,
    attractionAffinity: 50,
    intoxication: 0,
    satisfaction: 80,
    groupId: null,
    arrivalGameMinute: 0,
    status: "consuming",
    seatId: "cust-1",
    tabId: null,
    itemsOrderedCount: 1,
    totalSpent: 0,
    statusEnteredAtGameMinute: 0,
    phaseTargetMinutes: 5,
    ...overrides,
  };
}

describe("tvEffects", () => {
  it("hasOperationalTv is true only for an operational/degraded owned TV", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    expect(hasOperationalTv(state)).toBe(false);

    commandService.purchaseEquipment(state, new EventBus(), "equip-flat-screen-tv");
    expect(hasOperationalTv(state)).toBe(true);

    const tv = state.equipment.find((e) => e.category === "tv")!;
    tv.currentStatus = "degraded";
    expect(hasOperationalTv(state)).toBe(true);

    tv.currentStatus = "failed";
    expect(hasOperationalTv(state)).toBe(false);

    tv.currentStatus = "awaiting_repair";
    expect(hasOperationalTv(state)).toBe(false);
  });

  it("shouldOrderWhileWatchingTv respects the seeded RNG chance roll", () => {
    const alwaysOrders = { chance: () => true } as unknown as SeededRandom;
    const neverOrders = { chance: () => false } as unknown as SeededRandom;
    expect(shouldOrderWhileWatchingTv(alwaysOrders, customer())).toBe(true);
    expect(shouldOrderWhileWatchingTv(neverOrders, customer())).toBe(false);
  });

  it("extends the consuming->deciding_next_order dwell time when a TV is operational", () => {
    const rng = { int: () => 10, chance: () => false } as unknown as SeededRandom;

    const withoutTv = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    withoutTv.customers.push(customer({ statusEnteredAtGameMinute: 0, phaseTargetMinutes: 0 }));
    withoutTv.gameMinute = 1;
    advanceCustomers(withoutTv, rng, new EventBus());
    const targetWithoutTv = withoutTv.customers[0].phaseTargetMinutes;

    const withTv = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    commandService.purchaseEquipment(withTv, new EventBus(), "equip-flat-screen-tv");
    withTv.customers.push(customer({ statusEnteredAtGameMinute: 0, phaseTargetMinutes: 0 }));
    withTv.gameMinute = 1;
    advanceCustomers(withTv, rng, new EventBus());
    const targetWithTv = withTv.customers[0].phaseTargetMinutes;

    expect(targetWithTv).toBeGreaterThan(targetWithoutTv!);
  });

  it("describes the real TV benefit instead of falling back to the generic message", () => {
    const description = describeEquipmentBenefit("tv");
    expect(description).not.toBe("No direct gameplay effect yet.");
    expect(description.length).toBeGreaterThan(0);
  });
});

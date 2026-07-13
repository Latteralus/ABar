import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { advanceCustomers } from "@/simulation/engine/customerLifecycle";
import { CUSTOMER_BEHAVIOR_CONFIG } from "@/config/customerConfig";
import type { Customer, GameState } from "@/types";

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    firstName: "Jordan",
    lastName: "Lee",
    archetypeId: "archetype-regular",
    ageGroup: "adult",
    incomeLevel: "middle",
    spendingBudget: 50000,
    preferredCategories: ["beer"],
    priceSensitivity: 50,
    patience: 50,
    reviewTendency: 50,
    reorderTendency: 50,
    attractionAffinity: 50,
    intoxication: 0,
    satisfaction: 70,
    groupId: null,
    arrivalGameMinute: 0,
    status: "consuming",
    seatId: "seat-1",
    tabId: "tab-1",
    itemsOrderedCount: 1,
    totalSpent: 500,
    statusEnteredAtGameMinute: 0,
    ...overrides,
  };
}

function tick(state: GameState, rng: SeededRandom, bus: EventBus, minutes: number): void {
  for (let i = 0; i < minutes; i++) {
    state.gameMinute += 1;
    advanceCustomers(state, rng, bus);
  }
}

describe("consuming phase", () => {
  it("stays consuming until its rolled phaseTargetMinutes elapses, not a fixed 2 minutes", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const bus = new EventBus();
    const rng = new SeededRandom(1);
    const customer = makeCustomer({ phaseTargetMinutes: 10 });
    state.customers.push(customer);

    tick(state, rng, bus, 5);
    expect(customer.status).toBe("consuming");

    tick(state, rng, bus, 6);
    expect(customer.status).toBe("deciding_next_order");
  });
});

describe("socializing (deciding_next_order) phase", () => {
  it("does not roll the reorder decision before the socializing window elapses", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const bus = new EventBus();
    // chance() always true would normally force a reorder instantly if rolled per-minute;
    // this proves the decision is gated behind the phaseTargetMinutes window, not re-rolled every minute.
    const alwaysTrueRng = { chance: () => true, next: () => 0.01, pick: (arr: readonly unknown[]) => arr[0], int: () => 0 } as unknown as SeededRandom;
    const customer = makeCustomer({ status: "deciding_next_order", phaseTargetMinutes: 8, statusEnteredAtGameMinute: 0 });
    state.customers.push(customer);

    tick(state, alwaysTrueRng, bus, 7);
    expect(customer.status).toBe("deciding_next_order");
  });

  it("gains a little satisfaction each minute spent socializing", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const bus = new EventBus();
    const rng = new SeededRandom(1);
    const customer = makeCustomer({ status: "deciding_next_order", phaseTargetMinutes: 20, satisfaction: 50, statusEnteredAtGameMinute: 0 });
    state.customers.push(customer);

    tick(state, rng, bus, 5);
    expect(customer.satisfaction).toBeGreaterThan(50);
  });

  it("respects the max-visit-minutes cap and refuses to reorder past it", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const bus = new EventBus();
    const alwaysTrueRng = { chance: () => true, next: () => 0.01, pick: (arr: readonly unknown[]) => arr[0], int: () => 0 } as unknown as SeededRandom;
    const customer = makeCustomer({
      status: "deciding_next_order",
      phaseTargetMinutes: 1,
      statusEnteredAtGameMinute: 0,
      arrivalGameMinute: 0,
    });
    state.customers.push(customer);
    // A real customer reaching this phase already has a delivered item on their tab — without
    // this, customerLifecycle now (correctly) treats an empty tab as "nothing to pay for" and
    // sends them straight out the door instead of to payment (see the item_unavailable fix).
    state.tabs.push({
      id: "tab-1",
      tabNumber: 1,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      groupId: null,
      openedAtGameMinute: 0,
      closedAtGameMinute: null,
      lineItems: [{ productId: "prod-bottled-lager", productName: "Bottled Lager", quantity: 1, unitPrice: 500, preparedByEmployeeId: null }],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      paymentMethod: null,
      status: "open",
    });
    state.gameMinute = CUSTOMER_BEHAVIOR_CONFIG.maxVisitMinutesBeforeCheck + 5;

    advanceCustomers(state, alwaysTrueRng, bus);

    expect(customer.status).toBe("waiting_to_pay");
  });

  it("does roll toward another round when well within the visit cap and chance favors it", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const bus = new EventBus();
    const alwaysTrueRng = { chance: () => true, next: () => 0.01, pick: (arr: readonly unknown[]) => arr[0], int: () => 0 } as unknown as SeededRandom;
    const customer = makeCustomer({
      status: "deciding_next_order",
      phaseTargetMinutes: 1,
      statusEnteredAtGameMinute: 0,
      arrivalGameMinute: 0,
      totalSpent: 0,
      itemsOrderedCount: 0,
    });
    state.customers.push(customer);
    state.gameMinute = 5;

    advanceCustomers(state, alwaysTrueRng, bus);

    expect(customer.status).toBe("waiting_to_order");
  });
});

describe("pacing balance invariants", () => {
  it("makes even the fastest single round take a meaningful chunk of the 15-90 minute target, once order/service overhead is added on top", () => {
    const [minConsume] = CUSTOMER_BEHAVIOR_CONFIG.consumingDurationMinutesRange;
    const [minSocialize] = CUSTOMER_BEHAVIOR_CONFIG.socializingDurationMinutesRange;
    expect(minConsume + minSocialize).toBeGreaterThanOrEqual(12);
  });

  it("keeps the visit-length cap at or under the requested 90-minute maximum", () => {
    expect(CUSTOMER_BEHAVIOR_CONFIG.maxVisitMinutesBeforeCheck).toBeLessThanOrEqual(90);
  });

  it("never lets a single socializing window alone exceed the whole-visit cap", () => {
    const [, maxSocialize] = CUSTOMER_BEHAVIOR_CONFIG.socializingDurationMinutesRange;
    expect(maxSocialize).toBeLessThanOrEqual(CUSTOMER_BEHAVIOR_CONFIG.maxVisitMinutesBeforeCheck);
  });
});

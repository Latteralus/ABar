import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { CLOSING_CONFIG } from "@/config/customerConfig";
import { activeProperty } from "@/simulation/engine/activeProperty";
import { advanceCustomers } from "@/simulation/engine/customerLifecycle";
import { processArrivals } from "@/simulation/engine/customerArrivals";
import { processAttractionDecisions } from "@/simulation/engine/customerAttractionDecisions";
import { joinAttractionQueue } from "@/simulation/engine/attractionQueue";
import type { Customer, OwnedPropertyState } from "@/types";

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    firstName: "Jordan",
    lastName: "Lee",
    archetypeId: "archetype-regular",
    ageGroup: "adult",
    incomeLevel: "middle",
    spendingBudget: 5000,
    preferredCategories: ["beer"],
    priceSensitivity: 50,
    patience: 50,
    reviewTendency: 0,
    reorderTendency: 100,
    attractionAffinity: 80,
    intoxication: 0,
    satisfaction: 80,
    groupId: null,
    arrivalGameMinute: 0,
    status: "deciding_next_order",
    seatId: "seat-1",
    tabId: "tab-1",
    itemsOrderedCount: 1,
    totalSpent: 500,
    statusEnteredAtGameMinute: 0,
    ...overrides,
  };
}

function withOpenTab(prop: OwnedPropertyState, customer: Customer): void {
  prop.tabs.push({
    id: "tab-1",
    tabNumber: 1,
    customerId: customer.id,
    customerName: `${customer.firstName} ${customer.lastName}`,
    groupId: null,
    openedAtGameMinute: 0,
    closedAtGameMinute: null,
    lineItems: [{ productId: "prod-bottled-lager", productName: "Bottled Lager", quantity: 1, unitPrice: 500, preparedByEmployeeId: null }],
    subtotal: 500,
    tax: 0,
    tip: 0,
    total: 500,
    paymentMethod: null,
    status: "open",
  });
}

const alwaysChance = { chance: () => true, next: () => 0.01, pick: (arr: readonly unknown[]) => arr[0], int: () => 1 } as unknown as SeededRandom;

describe("final call (customerArrivals)", () => {
  it("stops new walk-ins at and after final call", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    state.gameMinute = CLOSING_CONFIG.finalCallGameMinute;

    processArrivals(state, prop, alwaysChance, bus);

    expect(prop.customers).toHaveLength(0);
  });
});

describe("final call (customerAttractionDecisions)", () => {
  it("stops new attraction queue joins at and after final call", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    commandService.purchaseAttraction(state, bus, "attraction-pool-table");
    prop.customers.push(makeCustomer({ tabId: null, itemsOrderedCount: 0, totalSpent: 0, status: "deciding_next_order" }));
    state.gameMinute = CLOSING_CONFIG.finalCallGameMinute;

    processAttractionDecisions(state, prop, alwaysChance, bus);

    expect(prop.attractions[0].queue).toHaveLength(0);
  });
});

describe("final call (customerLifecycle reorders)", () => {
  it("logs a last-call message exactly once, at the final call minute", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    const rng = new SeededRandom(1);
    state.gameMinute = CLOSING_CONFIG.finalCallGameMinute;

    advanceCustomers(state, prop, rng, bus);

    const lastCallLogs = state.activityLog.filter((e) => e.message.includes("Last call"));
    expect(lastCallLogs).toHaveLength(1);
  });

  it("never lets a customer order another round at or after final call, even with reorderTendency 100 and a guaranteed roll", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    const arrivalMinute = CLOSING_CONFIG.finalCallGameMinute - 10;
    const customer = makeCustomer({
      phaseTargetMinutes: 0,
      status: "deciding_next_order",
      arrivalGameMinute: arrivalMinute,
      statusEnteredAtGameMinute: arrivalMinute,
    });
    prop.customers.push(customer);
    withOpenTab(prop, customer);
    state.gameMinute = CLOSING_CONFIG.finalCallGameMinute;

    advanceCustomers(state, prop, alwaysChance, bus);

    expect(customer.status).toBe("waiting_to_pay");
  });

  it("still allows a reorder just before final call", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    const arrivalMinute = CLOSING_CONFIG.finalCallGameMinute - 11;
    const customer = makeCustomer({
      phaseTargetMinutes: 0,
      status: "deciding_next_order",
      arrivalGameMinute: arrivalMinute,
      statusEnteredAtGameMinute: arrivalMinute,
    });
    prop.customers.push(customer);
    withOpenTab(prop, customer);
    state.gameMinute = CLOSING_CONFIG.finalCallGameMinute - 1;

    advanceCustomers(state, prop, alwaysChance, bus);

    expect(customer.status).toBe("waiting_to_order");
  });
});

describe("wind-down (customerLifecycle)", () => {
  it("moves a consuming customer on to deciding_next_order immediately once wind-down starts, regardless of phaseTargetMinutes", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    const customer = makeCustomer({ status: "consuming", phaseTargetMinutes: 999, statusEnteredAtGameMinute: 0 });
    prop.customers.push(customer);
    state.gameMinute = CLOSING_CONFIG.windDownGameMinute;

    advanceCustomers(state, prop, alwaysChance, bus);

    expect(customer.status).toBe("deciding_next_order");
  });

  it("abandons a queued attraction wait immediately once wind-down starts, regardless of patience", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    commandService.purchaseAttraction(state, bus, "attraction-pool-table");
    const attraction = prop.attractions[0];
    const customer = makeCustomer({ status: "waiting_for_attraction", patience: 100, statusEnteredAtGameMinute: 0 });
    prop.customers.push(customer);
    joinAttractionQueue(state, prop, bus, attraction, [customer.id], null);
    state.gameMinute = CLOSING_CONFIG.windDownGameMinute;

    advanceCustomers(state, prop, alwaysChance, bus);

    expect(attraction.queue).toHaveLength(0);
    expect(customer.status).toBe("deciding_next_order");
  });
});

describe("hard sweep (customerLifecycle)", () => {
  it("still forces every remaining customer with an open tab toward payment by the hard-sweep minute", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    const rng = new SeededRandom(1);
    const customer = makeCustomer({ status: "consuming", statusEnteredAtGameMinute: 0 });
    prop.customers.push(customer);
    withOpenTab(prop, customer);
    state.gameMinute = CLOSING_CONFIG.hardSweepGameMinute;

    advanceCustomers(state, prop, rng, bus);

    expect(customer.status).toBe("waiting_to_pay");
  });
});

import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { advanceCustomers } from "@/simulation/engine/customerLifecycle";
import { CUSTOMER_BEHAVIOR_CONFIG } from "@/config/customerConfig";
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { Customer, OwnedPropertyState } from "@/types";

function makePaidCustomer(state: ReturnType<typeof createNewGameState>, prop: OwnedPropertyState): Customer {
  const customer: Customer = {
    id: "cust-1",
    firstName: "Sam",
    lastName: "Ortiz",
    archetypeId: "archetype-regular",
    ageGroup: "adult",
    incomeLevel: "middle",
    spendingBudget: 5000,
    preferredCategories: ["beer"],
    priceSensitivity: 50,
    patience: 50,
    reviewTendency: 50,
    reorderTendency: 50,
    attractionAffinity: 50,
    intoxication: 0,
    satisfaction: 80,
    groupId: null,
    arrivalGameMinute: 0,
    status: "leaving",
    seatId: "cust-1",
    tabId: "tab-1",
    itemsOrderedCount: 1,
    totalSpent: 500,
    statusEnteredAtGameMinute: state.gameMinute,
  };
  prop.customers.push(customer);
  return customer;
}

describe("post-payment customer lingering", () => {
  it("keeps a customer counted as present immediately after paying instead of vanishing", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    const rng = new SeededRandom(1);
    const customer = makePaidCustomer(state, prop);

    state.gameMinute += 1;
    advanceCustomers(state, prop, rng, bus);

    expect(customer.status).toBe("leaving");
    expect(prop.customers.some((c) => c.status !== "left" && c.status !== "removed")).toBe(true);
  });

  it("only actually departs after the configured linger period", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    const rng = new SeededRandom(1);
    const customer = makePaidCustomer(state, prop);

    for (let i = 0; i < CUSTOMER_BEHAVIOR_CONFIG.departureLingerMinutes - 1; i++) {
      state.gameMinute += 1;
      advanceCustomers(state, prop, rng, bus);
      expect(customer.status).toBe("leaving");
    }

    state.gameMinute += 1;
    advanceCustomers(state, prop, rng, bus);
    expect(customer.status).toBe("left");
  });

  it("applies no satisfaction penalty for a natural, satisfied departure", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    const rng = new SeededRandom(1);
    const customer = makePaidCustomer(state, prop);
    const satisfactionBefore = customer.satisfaction;

    for (let i = 0; i <= CUSTOMER_BEHAVIOR_CONFIG.departureLingerMinutes; i++) {
      state.gameMinute += 1;
      advanceCustomers(state, prop, rng, bus);
    }

    expect(customer.satisfaction).toBe(satisfactionBefore);
    expect(customer.leaveReason).toBe("satisfied_departure");
  });
});

describe("deciding_next_order with an empty tab (stockout audit fix)", () => {
  it("departs a customer whose only order(s) failed to prepare instead of routing them through payment for $0", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    const rng = {
      chance: () => false,
      next: () => 0.99,
      pick: (arr: readonly unknown[]) => arr[0],
      int: () => 0,
    } as unknown as SeededRandom;
    const customer: Customer = {
      id: "cust-1",
      firstName: "Nora",
      lastName: "Diaz",
      archetypeId: "archetype-regular",
      ageGroup: "adult",
      incomeLevel: "middle",
      spendingBudget: 5000,
      preferredCategories: ["beer"],
      priceSensitivity: 50,
      patience: 50,
      reviewTendency: 0,
      reorderTendency: 50,
      attractionAffinity: 50,
      intoxication: 0,
      satisfaction: 80,
      groupId: null,
      arrivalGameMinute: 0,
      status: "deciding_next_order",
      seatId: "cust-1",
      tabId: "tab-1",
      itemsOrderedCount: 1,
      totalSpent: 0,
      statusEnteredAtGameMinute: 0,
      phaseTargetMinutes: 0,
    };
    prop.customers.push(customer);
    // Opened when they first tried to order, but their prepare failed (stockout) — nothing was ever delivered.
    prop.tabs.push({
      id: "tab-1",
      tabNumber: 1,
      customerId: customer.id,
      customerName: "Nora Diaz",
      groupId: null,
      openedAtGameMinute: 0,
      closedAtGameMinute: null,
      lineItems: [],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      paymentMethod: null,
      status: "open",
    });

    state.gameMinute = 1;
    advanceCustomers(state, prop, rng, bus);

    expect(customer.status).toBe("left");
    expect(customer.leaveReason).toBe("item_unavailable");
    expect(prop.tabs[0].status).toBe("closed");
  });

  it("still routes a customer with a real delivered item through normal payment", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    const rng = {
      chance: () => false,
      next: () => 0.99,
      pick: (arr: readonly unknown[]) => arr[0],
      int: () => 0,
    } as unknown as SeededRandom;
    const customer = makePaidCustomer(state, prop);
    customer.status = "deciding_next_order";
    customer.phaseTargetMinutes = 0;
    prop.tabs.push({
      id: "tab-1",
      tabNumber: 1,
      customerId: customer.id,
      customerName: "Sam Ortiz",
      groupId: null,
      openedAtGameMinute: 0,
      closedAtGameMinute: null,
      lineItems: [
        { productId: "prod-bottled-lager", productName: "Bottled Lager", quantity: 1, unitPrice: 500, preparedByEmployeeId: null },
      ],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      paymentMethod: null,
      status: "open",
    });

    state.gameMinute = 1;
    advanceCustomers(state, prop, rng, bus);

    expect(customer.status).toBe("waiting_to_pay");
  });
});

import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { customerSpentSoFar } from "@/simulation/engine/payments";
import { selectProductForCustomer } from "@/simulation/engine/orderProcessing";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { Customer, Tab } from "@/types";

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    firstName: "Sam",
    lastName: "Lee",
    archetypeId: "archetype-regular",
    ageGroup: "adult",
    incomeLevel: "middle",
    spendingBudget: 2_000,
    preferredCategories: [],
    priceSensitivity: 50,
    patience: 50,
    reviewTendency: 0,
    reorderTendency: 100,
    attractionAffinity: 50,
    intoxication: 0,
    satisfaction: 80,
    groupId: null,
    arrivalGameMinute: 0,
    status: "waiting_to_order",
    seatId: "cust-1",
    tabId: "tab-1",
    itemsOrderedCount: 2,
    totalSpent: 0,
    statusEnteredAtGameMinute: 0,
    ...overrides,
  };
}

function openTab(subtotalCents: number): Tab {
  return {
    id: "tab-1",
    tabNumber: 1,
    customerId: "cust-1",
    customerName: "Sam Lee",
    groupId: null,
    openedAtGameMinute: 0,
    closedAtGameMinute: null,
    lineItems: [{ productId: "prod-cola", productName: "Cola", quantity: 1, unitPrice: subtotalCents, preparedByEmployeeId: null }],
    subtotal: 0,
    tax: 0,
    tip: 0,
    total: 0,
    paymentMethod: null,
    status: "open",
  };
}

describe("customerSpentSoFar (budget/tab misalignment fix)", () => {
  it("counts the currently open tab's running total, not just paid-tab history", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const cust = customer({ totalSpent: 0 });
    prop.customers.push(cust);
    prop.tabs.push(openTab(1_800));

    expect(customerSpentSoFar(prop, cust)).toBe(1_800);
  });

  it("adds paid-tab history and the open tab together", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const cust = customer({ totalSpent: 500 });
    prop.customers.push(cust);
    prop.tabs.push(openTab(1_000));

    expect(customerSpentSoFar(prop, cust)).toBe(1_500);
  });

  it("falls back to just totalSpent when there is no open tab", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const cust = customer({ totalSpent: 700, tabId: null });
    prop.customers.push(cust);

    expect(customerSpentSoFar(prop, cust)).toBe(700);
  });

  it("selectProductForCustomer correctly refuses an item that would push an already-heavy open tab over budget (the bug: this used to pass)", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    for (const item of prop.inventory) item.quantityOnHand = 100;
    for (const listing of prop.menu) listing.isActive = true;

    const cust = customer({ spendingBudget: 1_000, tabId: "tab-1" });
    prop.customers.push(cust);
    // Already has $9.50 on an open tab against a $10.00 budget — nothing should be offered
    // that doesn't fit in the remaining $0.50, even though every individual item is well under $10.
    prop.tabs.push(openTab(950));

    const rng = new SeededRandom(1);
    const listing = selectProductForCustomer(state, prop, cust, rng, true);
    expect(listing).toBeNull();
  });
});

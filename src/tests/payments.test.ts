import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { closeTabAndPay } from "@/simulation/engine/payments";
import { ECONOMY_CONFIG } from "@/config/economyConfig";
import type { Customer } from "@/types";

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
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
    satisfaction: 70,
    groupId: null,
    arrivalGameMinute: 0,
    status: "waiting_to_pay",
    seatId: "seat-1",
    tabId: "tab-1",
    itemsOrderedCount: 1,
    totalSpent: 0,
    statusEnteredAtGameMinute: 0,
    ...overrides,
  };
}

describe("closeTabAndPay", () => {
  it("applies sales tax and tracks it separately from revenue", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.tabs.push({
      id: "tab-1",
      tabNumber: 1,
      customerId: "cust-1",
      customerName: "Sam Ortiz",
      groupId: null,
      openedAtGameMinute: 0,
      closedAtGameMinute: null,
      lineItems: [{ productId: "prod-bottled-lager", productName: "Bottled Lager", quantity: 2, unitPrice: 500, preparedByEmployeeId: null }],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      paymentMethod: null,
      status: "open",
    });

    const bus = new EventBus();
    const rng = new SeededRandom(1); // deterministic cash/card + tip roll
    const customer = makeCustomer();
    const startingCash = state.cash;

    closeTabAndPay(state, rng, bus, customer, null);

    const tab = state.tabs[0];
    expect(tab.subtotal).toBe(1000);
    expect(tab.tax).toBe(Math.round(1000 * ECONOMY_CONFIG.salesTaxRate));
    expect(tab.status).toBe("closed");

    const taxLedgerEntry = state.ledger.find((e) => e.category === "liability_sales_tax_payable");
    expect(taxLedgerEntry?.amount).toBe(tab.tax);

    const revenueLedgerEntry = state.ledger.find((e) => e.category === "revenue_drink_sales");
    expect(revenueLedgerEntry?.amount).toBe(1000);

    // Cash should have moved by the net amount actually recorded (accounts for card fee if applicable).
    expect(state.cash).not.toBe(startingCash);
  });

  it("deducts a processing fee only when the customer pays by card", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.tabs.push({
      id: "tab-1",
      tabNumber: 1,
      customerId: "cust-1",
      customerName: "Sam Ortiz",
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

    const bus = new EventBus();
    const alwaysCardRng = { chance: () => true, next: () => 0.5 } as unknown as SeededRandom;
    closeTabAndPay(state, alwaysCardRng, bus, makeCustomer(), null);

    const feeEntry = state.ledger.find((e) => e.category === "opex_card_processing_fee");
    expect(feeEntry).toBeTruthy();
    expect(state.tabs[0].paymentMethod).toBe("card");
  });

  it("uses the player-adjustable bar tip share policy", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.policies.barTipSharePercent = 0.5;
    state.tabs.push({
      id: "tab-1",
      tabNumber: 1,
      customerId: "cust-1",
      customerName: "Sam Ortiz",
      groupId: null,
      openedAtGameMinute: 0,
      closedAtGameMinute: null,
      lineItems: [{ productId: "prod-bottled-lager", productName: "Bottled Lager", quantity: 1, unitPrice: 1000, preparedByEmployeeId: null }],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      paymentMethod: null,
      status: "open",
    });

    closeTabAndPay(state, { chance: () => false } as unknown as SeededRandom, new EventBus(), makeCustomer({ satisfaction: 100 }), null);

    const tip = state.tabs[0].tip;
    const barTipEntry = state.ledger.find((e) => e.category === "revenue_bar_tip_share");
    expect(barTipEntry?.amount).toBe(Math.round(tip * 0.5));
  });
});

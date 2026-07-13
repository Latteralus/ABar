import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { closeTabAndPay } from "@/simulation/engine/payments";
import { ECONOMY_CONFIG } from "@/config/economyConfig";
import type { Customer, Employee } from "@/types";

function makeEmployee(id: string): Employee {
  return {
    id,
    firstName: "Staff",
    lastName: id,
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
    performance: { customersServed: 0, itemsPrepared: 0, ordersFulfilled: 0, wasteGeneratedCents: 0, tipsEarnedCents: 0 },
  };
}

function makeCustomer(): Customer {
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
  };
}

describe("tip distribution", () => {
  it("splits the 75% employee share evenly across every currently-employed staff member", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.employees.push(makeEmployee("a"), makeEmployee("b"), makeEmployee("c"));
    state.tabs.push({
      id: "tab-1",
      tabNumber: 1,
      customerId: "cust-1",
      customerName: "Sam Ortiz",
      groupId: null,
      openedAtGameMinute: 0,
      closedAtGameMinute: null,
      lineItems: [
        { productId: "prod-bottled-lager", productName: "Bottled Lager", quantity: 4, unitPrice: 500, preparedByEmployeeId: null },
      ],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      paymentMethod: null,
      status: "open",
    });

    const bus = new EventBus();
    const rng = new SeededRandom(7);
    const [payingEmployee] = state.employees;
    closeTabAndPay(state, rng, bus, makeCustomer(), payingEmployee);

    const tab = state.tabs[0];
    const expectedBarShare = Math.round(tab.tip * ECONOMY_CONFIG.tips.barSharePercent);
    const expectedEmployeeShare = tab.tip - expectedBarShare;

    const totalDistributed = state.employees.reduce((sum, e) => sum + e.performance.tipsEarnedCents, 0);
    expect(totalDistributed).toBe(expectedEmployeeShare);

    // No single employee should get dramatically more than an even share (within a rounding cent).
    const shares = state.employees.map((e) => e.performance.tipsEarnedCents);
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
  });

  it("does not blow up when there are no employees to split tips among", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.tabs.push({
      id: "tab-1",
      tabNumber: 1,
      customerId: "cust-1",
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

    const bus = new EventBus();
    const rng = new SeededRandom(3);
    expect(() => closeTabAndPay(state, rng, bus, makeCustomer(), null)).not.toThrow();
  });
});

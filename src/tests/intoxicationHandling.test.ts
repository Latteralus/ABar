import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { selectProductForCustomer } from "@/simulation/engine/orderProcessing";
import { processIntoxicatedCustomers } from "@/simulation/engine/intoxicationHandling";
import { REMOVAL_CONFIG } from "@/config/customerConfig";
import { ALCOHOLIC_PRODUCT_IDS } from "@/data/recipes/recipes";
import type { Customer, Employee, GameState } from "@/types";

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    firstName: "Jordan",
    lastName: "Lee",
    archetypeId: "archetype-regular",
    ageGroup: "adult",
    incomeLevel: "middle",
    spendingBudget: 5000,
    preferredCategories: ["liquor", "beer", "mixed_drink"],
    priceSensitivity: 50,
    patience: 50,
    reviewTendency: 50,
    reorderTendency: 50,
    attractionAffinity: 50,
    intoxication: 90,
    satisfaction: 70,
    groupId: null,
    arrivalGameMinute: 0,
    status: "waiting_to_order",
    seatId: "seat-1",
    tabId: null,
    itemsOrderedCount: 3,
    totalSpent: 0,
    statusEnteredAtGameMinute: 0,
    ...overrides,
  };
}

function makeEmployee(role: Employee["role"], id = "emp-1"): Employee {
  return {
    id,
    firstName: "Staff",
    lastName: id,
    role,
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

function activateAllMenu(state: GameState): void {
  for (const listing of state.menu) listing.isActive = true;
}

describe("intoxication service cutoff", () => {
  it("never offers an alcoholic product once a customer is past the cutoff", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    activateAllMenu(state);
    const rng = new SeededRandom(1);
    const customer = makeCustomer();

    for (let i = 0; i < 50; i++) {
      const listing = selectProductForCustomer(state, customer, rng, false);
      if (listing) expect(ALCOHOLIC_PRODUCT_IDS.has(listing.productId)).toBe(false);
    }
  });

  it("does offer alcohol when allowed", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    activateAllMenu(state);
    const rng = new SeededRandom(1);
    const customer = makeCustomer();

    const sawAlcohol = Array.from({ length: 50 }, () => selectProductForCustomer(state, customer, rng, true)).some(
      (listing) => listing && ALCOHOLIC_PRODUCT_IDS.has(listing.productId),
    );
    expect(sawAlcohol).toBe(true);
  });
});

describe("intoxication removal flow", () => {
  it("queues a formal remove_customer task when security is on staff", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.employees.push(makeEmployee("security"));
    state.customers.push(makeCustomer({ intoxication: 95 }));
    const bus = new EventBus();
    const rng = new SeededRandom(1);

    processIntoxicatedCustomers(state, rng, bus);

    const task = state.tasks.find((t) => t.type === "remove_customer");
    expect(task).toBeTruthy();
    expect(task?.eligibleRoles).toEqual(["security"]);
  });

  it("without security, warns the customer first rather than removing them immediately", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const customer = makeCustomer({ intoxication: 95 });
    state.customers.push(customer);
    const bus = new EventBus();
    const rng = new SeededRandom(1);

    processIntoxicatedCustomers(state, rng, bus);

    expect(customer.status).not.toBe("left");
    expect(customer.removalStage).toBe("warned");
    expect(state.tasks.some((t) => t.type === "remove_customer")).toBe(false);
  });

  it("escalates to calling the police when the customer refuses to cooperate", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const customer = makeCustomer({ intoxication: 95 });
    state.customers.push(customer);
    const bus = new EventBus();
    // chance() always reports "does not cooperate" so the customer reliably escalates to the police.
    const alwaysRefuseRng = { chance: () => false, next: () => 0.99 } as unknown as SeededRandom;

    processIntoxicatedCustomers(state, alwaysRefuseRng, bus); // first sighting -> warned
    state.gameMinute += REMOVAL_CONFIG.warnedResolutionMinutes;
    processIntoxicatedCustomers(state, alwaysRefuseRng, bus); // resolve warning -> police

    expect(customer.removalStage).toBe("police_called");

    state.gameMinute += REMOVAL_CONFIG.policeResolutionMinutes;
    processIntoxicatedCustomers(state, alwaysRefuseRng, bus); // resolve police call -> removed

    expect(customer.status).toBe("removed");
    expect(customer.leaveReason).toBe("removed_intoxication");
  });
});

import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { saveService } from "@/services/saveService";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { ATTRACTION_CONFIG } from "@/config/attractionConfig";
import { ATTRACTION_CATALOG } from "@/data/attractions/attractionCatalog";
import {
  abandonAttractionQueue,
  ensureAttractionQueueProgress,
  joinAttractionQueue,
  selectNextSession,
} from "@/simulation/engine/attractionQueue";
import { advanceAttractionSessions, attractionWaitToleranceMinutes } from "@/simulation/engine/attractionSessions";
import { decayAttractionOnUse, processAttractionWear } from "@/simulation/engine/attractionCondition";
import { shouldOrderWhileAtAttraction } from "@/simulation/engine/customerAttractionDecisions";
import { ensureOrderTasks } from "@/simulation/engine/orderProcessing";
import type { Attraction, Customer, GameState } from "@/types";

const POOL_TABLE_ID = "attraction-pool-table";

function setup(): { state: GameState; bus: EventBus } {
  const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
  const bus = new EventBus();
  commandService.purchaseAttraction(state, bus, POOL_TABLE_ID);
  return { state, bus };
}

function poolTable(state: GameState): Attraction {
  return state.attractions[0];
}

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
    reviewTendency: 50,
    reorderTendency: 50,
    attractionAffinity: 80,
    intoxication: 0,
    satisfaction: 70,
    groupId: null,
    arrivalGameMinute: 0,
    status: "deciding_next_order",
    seatId: "seat-1",
    tabId: null,
    itemsOrderedCount: 0,
    totalSpent: 0,
    statusEnteredAtGameMinute: 0,
    ...overrides,
  };
}

describe("purchaseAttraction", () => {
  it("adds a pool table and debits the purchase price", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const bus = new EventBus();
    const cashBefore = state.cash;
    const catalogEntry = ATTRACTION_CATALOG.find((e) => e.id === POOL_TABLE_ID)!;

    const result = commandService.purchaseAttraction(state, bus, POOL_TABLE_ID);

    expect(result.success).toBe(true);
    expect(state.attractions).toHaveLength(1);
    expect(state.cash).toBe(cashBefore - catalogEntry.purchasePrice);
  });

  it("rejects a purchase that would exceed the property's floor space", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const bus = new EventBus();
    // Starter property has 40 units of floor space; buy pool tables (30 each) until the next one won't fit.
    commandService.purchaseAttraction(state, bus, POOL_TABLE_ID);
    const result = commandService.purchaseAttraction(state, bus, POOL_TABLE_ID);
    expect(result.success).toBe(false);
  });
});

describe("attraction queue", () => {
  it("lets a solo customer join and flips their status to waiting_for_attraction", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    state.customers.push(makeCustomer());

    const joined = joinAttractionQueue(state, bus, attraction, ["cust-1"], null);

    expect(joined).toBe(true);
    expect(attraction.queue).toHaveLength(1);
    expect(state.customers[0].status).toBe("waiting_for_attraction");
  });

  it("rejects joining once the queue is at capacity", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    const catalogEntry = ATTRACTION_CATALOG.find((e) => e.id === POOL_TABLE_ID)!;
    for (let i = 0; i < catalogEntry.queueCapacityParties; i++) {
      state.customers.push(makeCustomer({ id: `cust-${i}` }));
      expect(joinAttractionQueue(state, bus, attraction, [`cust-${i}`], null)).toBe(true);
    }

    state.customers.push(makeCustomer({ id: "cust-overflow" }));
    expect(joinAttractionQueue(state, bus, attraction, ["cust-overflow"], null)).toBe(false);
  });

  it("lets a single customer start a game alone, without waiting for a second player", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    state.customers.push(makeCustomer({ id: "cust-a" }));
    joinAttractionQueue(state, bus, attraction, ["cust-a"], null);

    ensureAttractionQueueProgress(state, bus);

    expect(attraction.queue).toHaveLength(0);
    expect(attraction.activeSession?.participantIds).toEqual(["cust-a"]);
    expect(state.customers[0].status).toBe("using_attraction");
  });

  it("still lets two separately-queued solo customers each get their own turn, one after the other", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    state.customers.push(makeCustomer({ id: "cust-a" }), makeCustomer({ id: "cust-b" }));
    joinAttractionQueue(state, bus, attraction, ["cust-a"], null);
    joinAttractionQueue(state, bus, attraction, ["cust-b"], null);

    ensureAttractionQueueProgress(state, bus);

    // cust-a takes the table first; cust-b is still queued, not merged into the same game.
    expect(attraction.activeSession?.participantIds).toEqual(["cust-a"]);
    expect(attraction.queue).toHaveLength(1);
    expect(attraction.queue[0].customerIds).toEqual(["cust-b"]);
  });

  it("starts an existing arrival group's own session without waiting to combine with anyone else", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    state.customerGroups.push({ id: "group-1", memberIds: ["cust-a", "cust-b"], arrivalGameMinute: 0 });
    state.customers.push(
      makeCustomer({ id: "cust-a", groupId: "group-1" }),
      makeCustomer({ id: "cust-b", groupId: "group-1" }),
    );
    joinAttractionQueue(state, bus, attraction, ["cust-a", "cust-b"], "group-1");

    ensureAttractionQueueProgress(state, bus);

    expect(attraction.activeSession?.participantIds).toEqual(["cust-a", "cust-b"]);
  });

  it("selectNextSession prefers the earliest single entry that already fits [min, max]", () => {
    const attraction = poolTable(setup().state);
    attraction.queue = [
      { id: "q1", customerIds: ["solo"], groupId: null, joinedAtGameMinute: 0 },
      { id: "q2", customerIds: ["g1", "g2", "g3", "g4"], groupId: "group-1", joinedAtGameMinute: 1 },
    ];

    // Pool's real min is 1, so the solo entry alone already qualifies and goes first (FIFO).
    expect(selectNextSession(attraction, 1, 4).map((e) => e.id)).toEqual(["q1"]);
  });

  it("selectNextSession: a qualifying entry further back doesn't get stuck behind a front entry that can't reach min alone", () => {
    // Direct unit test with a synthetic min=2 (no real catalog entry needs this today, but the
    // engine must stay correct for a future attraction type that does) — this reproduces the
    // exact bug caught during development: greedily combining front-to-back would "spend" the
    // solo entry's 1 slot and then have no room left for the group of 4, deadlocking both.
    const attraction = poolTable(setup().state);
    attraction.queue = [
      { id: "solo-entry", customerIds: ["solo"], groupId: null, joinedAtGameMinute: 0 },
      { id: "group-entry", customerIds: ["g1", "g2", "g3", "g4"], groupId: "group-1", joinedAtGameMinute: 1 },
    ];

    const taken = selectNextSession(attraction, 2, 4);

    expect(taken.map((e) => e.id)).toEqual(["group-entry"]);
  });

  it("abandonAttractionQueue removes the party, records history, and applies a satisfaction penalty", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    const customer = makeCustomer({ satisfaction: 70 });
    state.customers.push(customer);
    joinAttractionQueue(state, bus, attraction, [customer.id], null);

    abandonAttractionQueue(state, bus, customer);

    expect(attraction.queue).toHaveLength(0);
    expect(attraction.queueHistory).toHaveLength(1);
    expect(attraction.queueHistory[0].resolution).toBe("abandoned");
    expect(customer.satisfaction).toBe(70 - ATTRACTION_CONFIG.satisfactionLossOnAbandonQueue);
    expect(customer.status).toBe("deciding_next_order");
  });
});

describe("attraction sessions", () => {
  it("keeps a full arrival group occupied for the full session duration, then frees the table", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    const catalogEntry = ATTRACTION_CATALOG.find((e) => e.id === POOL_TABLE_ID)!;
    state.customerGroups.push({ id: "group-1", memberIds: ["cust-a", "cust-b"], arrivalGameMinute: 0 });
    state.customers.push(makeCustomer({ id: "cust-a", groupId: "group-1" }), makeCustomer({ id: "cust-b", groupId: "group-1" }));
    joinAttractionQueue(state, bus, attraction, ["cust-a", "cust-b"], "group-1");
    ensureAttractionQueueProgress(state, bus);

    for (let i = 0; i < catalogEntry.gameDurationMinutes - 1; i++) {
      advanceAttractionSessions(state, bus);
      expect(attraction.activeSession).not.toBeNull();
      expect(state.customers.every((c) => c.status === "using_attraction")).toBe(true);
    }

    advanceAttractionSessions(state, bus);

    expect(attraction.activeSession).toBeNull();
    expect(attraction.completedSessions).toHaveLength(1);
    expect(state.customers.every((c) => c.status === "deciding_next_order")).toBe(true);
  });

  it("collects the same flat game fee whether one customer plays alone or a full group plays together", () => {
    const catalogEntry = ATTRACTION_CATALOG.find((e) => e.id === POOL_TABLE_ID)!;

    const solo = setup();
    solo.state.customers.push(makeCustomer({ id: "cust-a" }));
    const soloCashBefore = solo.state.cash;
    joinAttractionQueue(solo.state, solo.bus, poolTable(solo.state), ["cust-a"], null);
    ensureAttractionQueueProgress(solo.state, solo.bus);
    expect(solo.state.cash).toBe(soloCashBefore + catalogEntry.pricePerGameCents);

    const group = setup();
    group.state.customerGroups.push({ id: "group-1", memberIds: ["cust-a", "cust-b"], arrivalGameMinute: 0 });
    group.state.customers.push(makeCustomer({ id: "cust-a", groupId: "group-1" }), makeCustomer({ id: "cust-b", groupId: "group-1" }));
    const groupCashBefore = group.state.cash;
    joinAttractionQueue(group.state, group.bus, poolTable(group.state), ["cust-a", "cust-b"], "group-1");
    ensureAttractionQueueProgress(group.state, group.bus);
    expect(group.state.cash).toBe(groupCashBefore + catalogEntry.pricePerGameCents);

    const feeEntry = group.state.ledger.find((e) => e.category === "revenue_attraction");
    expect(feeEntry?.amount).toBe(catalogEntry.pricePerGameCents);
  });

  it("lets the player adjust attraction prices before a game starts", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    const result = commandService.setAttractionPrice(state, attraction.id, 350);
    expect(result.success).toBe(true);

    state.customers.push(makeCustomer({ id: "cust-a" }));
    const cashBefore = state.cash;
    joinAttractionQueue(state, bus, attraction, ["cust-a"], null);
    ensureAttractionQueueProgress(state, bus);

    expect(attraction.activeSession?.feeCents).toBe(350);
    expect(state.cash).toBe(cashBefore + 350);
  });

  it("decays condition on use", () => {
    const { state } = setup();
    const attraction = poolTable(state);
    const before = attraction.condition;
    decayAttractionOnUse(attraction);
    expect(attraction.condition).toBeCloseTo(before - ATTRACTION_CONFIG.usageConditionDecayPerGame, 5);
  });
});

describe("attraction breakdown", () => {
  it("can fail a degraded attraction when the roll succeeds", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    attraction.condition = 10;
    attraction.currentStatus = "degraded";
    const alwaysBreaks = { chance: () => true } as unknown as SeededRandom;

    processAttractionWear(state, alwaysBreaks, bus);

    expect(attraction.currentStatus).toBe("failed");
  });

  it("leaves an operational attraction alone regardless of the roll", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    attraction.currentStatus = "operational";
    const alwaysBreaks = { chance: () => true } as unknown as SeededRandom;

    processAttractionWear(state, alwaysBreaks, bus);

    expect(attraction.currentStatus).toBe("operational");
  });
});

describe("ordering while at an attraction", () => {
  it("shouldOrderWhileAtAttraction scales the configured chance by reorderTendency", () => {
    let capturedChance = -1;
    const rng = { chance: (p: number) => { capturedChance = p; return true; } } as unknown as SeededRandom;
    const customer = makeCustomer({ reorderTendency: 100 });

    expect(shouldOrderWhileAtAttraction(rng, customer)).toBe(true);
    expect(capturedChance).toBeCloseTo(ATTRACTION_CONFIG.additionalOrderChancePerMinute * 1.5, 5);
  });

  it("ensureOrderTasks queues a take_order task for a customer using an attraction when the roll succeeds", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    const customer = makeCustomer({ status: "using_attraction" });
    state.customers.push(customer);
    attraction.activeSession = {
      id: "session-1",
      participantIds: [customer.id],
      startedAtGameMinute: 0,
      remainingGameMinutes: 10,
      feeCents: 200,
    };
    const alwaysWantsToOrder = { chance: () => true } as unknown as SeededRandom;

    ensureOrderTasks(state, alwaysWantsToOrder, bus);

    const task = state.tasks.find((t) => t.type === "take_order" && t.customerId === customer.id);
    expect(task).toBeTruthy();
  });
});

describe("attractionWaitToleranceMinutes", () => {
  it("increases with patience", () => {
    expect(attractionWaitToleranceMinutes(100)).toBeGreaterThan(attractionWaitToleranceMinutes(0));
  });
});

describe("determinism across save/reload", () => {
  it("round-trips attraction state (queue, session, history) exactly", () => {
    const { state, bus } = setup();
    const attraction = poolTable(state);
    state.customers.push(makeCustomer({ id: "cust-a" }), makeCustomer({ id: "cust-b" }), makeCustomer({ id: "cust-c" }));
    joinAttractionQueue(state, bus, attraction, ["cust-a"], null);
    joinAttractionQueue(state, bus, attraction, ["cust-b"], null);
    ensureAttractionQueueProgress(state, bus); // starts a solo session with cust-a; cust-b stays queued
    joinAttractionQueue(state, bus, attraction, ["cust-c"], null); // also queued, behind cust-b

    saveService.save(state);
    const loaded = saveService.load(state.saveId);

    expect(loaded).not.toBeNull();
    expect(loaded!.attractions).toEqual(state.attractions);
  });
});

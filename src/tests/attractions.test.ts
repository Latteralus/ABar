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
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { Attraction, Customer, GameState, OwnedPropertyState } from "@/types";

const POOL_TABLE_ID = "attraction-pool-table";

function setup(): { state: GameState; bus: EventBus; prop: OwnedPropertyState } {
  const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
  const bus = new EventBus();
  const prop = activeProperty(state);
  commandService.purchaseAttraction(state, bus, POOL_TABLE_ID);
  return { state, bus, prop };
}

function poolTable(prop: OwnedPropertyState): Attraction {
  return prop.attractions[0];
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
    const prop = activeProperty(state);
    const bus = new EventBus();
    const cashBefore = state.cash;
    const catalogEntry = ATTRACTION_CATALOG.find((e) => e.id === POOL_TABLE_ID)!;

    const result = commandService.purchaseAttraction(state, bus, POOL_TABLE_ID);

    expect(result.success).toBe(true);
    expect(prop.attractions).toHaveLength(1);
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
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    prop.customers.push(makeCustomer());

    const joined = joinAttractionQueue(state, prop, bus, attraction, ["cust-1"], null);

    expect(joined).toBe(true);
    expect(attraction.queue).toHaveLength(1);
    expect(prop.customers[0].status).toBe("waiting_for_attraction");
  });

  it("rejects joining once the queue is at capacity", () => {
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    const catalogEntry = ATTRACTION_CATALOG.find((e) => e.id === POOL_TABLE_ID)!;
    for (let i = 0; i < catalogEntry.queueCapacityParties; i++) {
      prop.customers.push(makeCustomer({ id: `cust-${i}` }));
      expect(joinAttractionQueue(state, prop, bus, attraction, [`cust-${i}`], null)).toBe(true);
    }

    prop.customers.push(makeCustomer({ id: "cust-overflow" }));
    expect(joinAttractionQueue(state, prop, bus, attraction, ["cust-overflow"], null)).toBe(false);
  });

  it("lets a single customer start a game alone, without waiting for a second player", () => {
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    prop.customers.push(makeCustomer({ id: "cust-a" }));
    joinAttractionQueue(state, prop, bus, attraction, ["cust-a"], null);

    ensureAttractionQueueProgress(state, prop, bus);

    expect(attraction.queue).toHaveLength(0);
    expect(attraction.activeSession?.participantIds).toEqual(["cust-a"]);
    expect(prop.customers[0].status).toBe("using_attraction");
  });

  it("still lets two separately-queued solo customers each get their own turn, one after the other", () => {
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    prop.customers.push(makeCustomer({ id: "cust-a" }), makeCustomer({ id: "cust-b" }));
    joinAttractionQueue(state, prop, bus, attraction, ["cust-a"], null);
    joinAttractionQueue(state, prop, bus, attraction, ["cust-b"], null);

    ensureAttractionQueueProgress(state, prop, bus);

    // cust-a takes the table first; cust-b is still queued, not merged into the same game.
    expect(attraction.activeSession?.participantIds).toEqual(["cust-a"]);
    expect(attraction.queue).toHaveLength(1);
    expect(attraction.queue[0].customerIds).toEqual(["cust-b"]);
  });

  it("starts an existing arrival group's own session without waiting to combine with anyone else", () => {
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    prop.customerGroups.push({ id: "group-1", memberIds: ["cust-a", "cust-b"], arrivalGameMinute: 0 });
    prop.customers.push(makeCustomer({ id: "cust-a", groupId: "group-1" }), makeCustomer({ id: "cust-b", groupId: "group-1" }));
    joinAttractionQueue(state, prop, bus, attraction, ["cust-a", "cust-b"], "group-1");

    ensureAttractionQueueProgress(state, prop, bus);

    expect(attraction.activeSession?.participantIds).toEqual(["cust-a", "cust-b"]);
  });

  it("selectNextSession prefers the earliest single entry that already fits [min, max]", () => {
    const { prop } = setup();
    const attraction = poolTable(prop);
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
    const { prop } = setup();
    const attraction = poolTable(prop);
    attraction.queue = [
      { id: "solo-entry", customerIds: ["solo"], groupId: null, joinedAtGameMinute: 0 },
      { id: "group-entry", customerIds: ["g1", "g2", "g3", "g4"], groupId: "group-1", joinedAtGameMinute: 1 },
    ];

    const taken = selectNextSession(attraction, 2, 4);

    expect(taken.map((e) => e.id)).toEqual(["group-entry"]);
  });

  it("abandonAttractionQueue removes the party, records history, and applies a satisfaction penalty", () => {
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    const customer = makeCustomer({ satisfaction: 70 });
    prop.customers.push(customer);
    joinAttractionQueue(state, prop, bus, attraction, [customer.id], null);

    abandonAttractionQueue(state, prop, bus, customer);

    expect(attraction.queue).toHaveLength(0);
    expect(attraction.queueHistory).toHaveLength(1);
    expect(attraction.queueHistory[0].resolution).toBe("abandoned");
    expect(customer.satisfaction).toBe(70 - ATTRACTION_CONFIG.satisfactionLossOnAbandonQueue);
    expect(customer.status).toBe("deciding_next_order");
  });
});

describe("attraction sessions", () => {
  it("keeps a full arrival group occupied for the full session duration, then frees the table", () => {
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    const catalogEntry = ATTRACTION_CATALOG.find((e) => e.id === POOL_TABLE_ID)!;
    prop.customerGroups.push({ id: "group-1", memberIds: ["cust-a", "cust-b"], arrivalGameMinute: 0 });
    prop.customers.push(makeCustomer({ id: "cust-a", groupId: "group-1" }), makeCustomer({ id: "cust-b", groupId: "group-1" }));
    joinAttractionQueue(state, prop, bus, attraction, ["cust-a", "cust-b"], "group-1");
    ensureAttractionQueueProgress(state, prop, bus);

    for (let i = 0; i < catalogEntry.gameDurationMinutes - 1; i++) {
      advanceAttractionSessions(state, prop, bus);
      expect(attraction.activeSession).not.toBeNull();
      expect(prop.customers.every((c) => c.status === "using_attraction")).toBe(true);
    }

    advanceAttractionSessions(state, prop, bus);

    expect(attraction.activeSession).toBeNull();
    expect(attraction.completedSessions).toHaveLength(1);
    expect(prop.customers.every((c) => c.status === "deciding_next_order")).toBe(true);
  });

  it("collects the same flat game fee whether one customer plays alone or a full group plays together", () => {
    const catalogEntry = ATTRACTION_CATALOG.find((e) => e.id === POOL_TABLE_ID)!;

    const solo = setup();
    solo.prop.customers.push(makeCustomer({ id: "cust-a" }));
    const soloCashBefore = solo.state.cash;
    joinAttractionQueue(solo.state, solo.prop, solo.bus, poolTable(solo.prop), ["cust-a"], null);
    ensureAttractionQueueProgress(solo.state, solo.prop, solo.bus);
    expect(solo.state.cash).toBe(soloCashBefore + catalogEntry.pricePerGameCents);

    const group = setup();
    group.prop.customerGroups.push({ id: "group-1", memberIds: ["cust-a", "cust-b"], arrivalGameMinute: 0 });
    group.prop.customers.push(makeCustomer({ id: "cust-a", groupId: "group-1" }), makeCustomer({ id: "cust-b", groupId: "group-1" }));
    const groupCashBefore = group.state.cash;
    joinAttractionQueue(group.state, group.prop, group.bus, poolTable(group.prop), ["cust-a", "cust-b"], "group-1");
    ensureAttractionQueueProgress(group.state, group.prop, group.bus);
    expect(group.state.cash).toBe(groupCashBefore + catalogEntry.pricePerGameCents);

    const feeEntry = group.state.ledger.find((e) => e.category === "revenue_attraction");
    expect(feeEntry?.amount).toBe(catalogEntry.pricePerGameCents);
  });

  it("lets the player adjust attraction prices before a game starts", () => {
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    const result = commandService.setAttractionPrice(state, attraction.id, 350);
    expect(result.success).toBe(true);

    prop.customers.push(makeCustomer({ id: "cust-a" }));
    const cashBefore = state.cash;
    joinAttractionQueue(state, prop, bus, attraction, ["cust-a"], null);
    ensureAttractionQueueProgress(state, prop, bus);

    expect(attraction.activeSession?.feeCents).toBe(350);
    expect(state.cash).toBe(cashBefore + 350);
  });

  it("decays condition on use", () => {
    const { prop } = setup();
    const attraction = poolTable(prop);
    const before = attraction.condition;
    decayAttractionOnUse(attraction);
    expect(attraction.condition).toBeCloseTo(before - ATTRACTION_CONFIG.usageConditionDecayPerGame, 5);
  });
});

describe("attraction breakdown", () => {
  it("can fail a degraded attraction when the roll succeeds", () => {
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    attraction.condition = 10;
    attraction.currentStatus = "degraded";
    const alwaysBreaks = { chance: () => true } as unknown as SeededRandom;

    processAttractionWear(state, prop, alwaysBreaks, bus);

    expect(attraction.currentStatus).toBe("failed");
  });

  it("leaves an operational attraction alone regardless of the roll", () => {
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    attraction.currentStatus = "operational";
    const alwaysBreaks = { chance: () => true } as unknown as SeededRandom;

    processAttractionWear(state, prop, alwaysBreaks, bus);

    expect(attraction.currentStatus).toBe("operational");
  });
});

describe("ordering while at an attraction", () => {
  it("shouldOrderWhileAtAttraction scales the configured chance by reorderTendency", () => {
    let capturedChance = -1;
    const rng = {
      chance: (p: number) => {
        capturedChance = p;
        return true;
      },
    } as unknown as SeededRandom;
    const customer = makeCustomer({ reorderTendency: 100 });

    expect(shouldOrderWhileAtAttraction(rng, customer)).toBe(true);
    expect(capturedChance).toBeCloseTo(ATTRACTION_CONFIG.additionalOrderChancePerMinute * 1.5, 5);
  });

  it("ensureOrderTasks queues a take_order task for a customer using an attraction when the roll succeeds", () => {
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    const customer = makeCustomer({ status: "using_attraction" });
    prop.customers.push(customer);
    attraction.activeSession = {
      id: "session-1",
      participantIds: [customer.id],
      startedAtGameMinute: 0,
      remainingGameMinutes: 10,
      feeCents: 200,
    };
    const alwaysWantsToOrder = { chance: () => true } as unknown as SeededRandom;

    ensureOrderTasks(state, prop, alwaysWantsToOrder, bus);

    const task = prop.tasks.find((t) => t.type === "take_order" && t.customerId === customer.id);
    expect(task).toBeTruthy();
  });
});

describe("attractionWaitToleranceMinutes", () => {
  it("increases with patience", () => {
    expect(attractionWaitToleranceMinutes(100)).toBeGreaterThan(attractionWaitToleranceMinutes(0));
  });
});

describe.each([
  ["attraction-darts", 2],
  ["attraction-arcade-cabinet", 1],
  ["attraction-karaoke-booth", 1],
])("new attraction catalog row: %s", (catalogId, minParticipants) => {
  it("purchases at the catalog price and appears in state.attractions", () => {
    const catalogEntry = ATTRACTION_CATALOG.find((e) => e.id === catalogId)!;
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    const cashBefore = state.cash;

    const result = commandService.purchaseAttraction(state, bus, catalogId);

    expect(result.success).toBe(true);
    expect(prop.attractions).toHaveLength(1);
    expect(prop.attractions[0].category).toBe(catalogEntry.category);
    expect(state.cash).toBe(cashBefore - catalogEntry.purchasePrice);
  });

  it("fills a session once enough participants join and collects the flat per-game fee", () => {
    const catalogEntry = ATTRACTION_CATALOG.find((e) => e.id === catalogId)!;
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    commandService.purchaseAttraction(state, bus, catalogId);
    const attraction = prop.attractions[0];
    const cashBefore = state.cash;

    if (minParticipants === 1) {
      prop.customers.push(makeCustomer({ id: "cust-a" }));
      joinAttractionQueue(state, prop, bus, attraction, ["cust-a"], null);
    } else {
      prop.customerGroups.push({ id: "group-1", memberIds: ["cust-a", "cust-b"], arrivalGameMinute: 0 });
      prop.customers.push(makeCustomer({ id: "cust-a", groupId: "group-1" }), makeCustomer({ id: "cust-b", groupId: "group-1" }));
      joinAttractionQueue(state, prop, bus, attraction, ["cust-a", "cust-b"], "group-1");
    }

    ensureAttractionQueueProgress(state, prop, bus);

    expect(attraction.activeSession).not.toBeNull();
    expect(state.cash).toBe(cashBefore + catalogEntry.pricePerGameCents);
  });
});

describe("breakdown flavor text is catalog-driven", () => {
  it("uses the darts catalog entry's breakdownDescription, not pool table's hardcoded text", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    commandService.purchaseAttraction(state, bus, "attraction-darts");
    const attraction = prop.attractions[0];
    attraction.condition = 10;
    attraction.currentStatus = "degraded";
    const alwaysBreaks = { chance: () => true } as unknown as SeededRandom;

    processAttractionWear(state, prop, alwaysBreaks, bus);

    const lastLog = state.activityLog[state.activityLog.length - 1];
    expect(lastLog.message).toContain("a damaged dartboard");
    expect(lastLog.message).not.toContain("damaged cue");
  });
});

describe("determinism across save/reload", () => {
  it("round-trips attraction state (queue, session, history) exactly", () => {
    const { state, bus, prop } = setup();
    const attraction = poolTable(prop);
    prop.customers.push(makeCustomer({ id: "cust-a" }), makeCustomer({ id: "cust-b" }), makeCustomer({ id: "cust-c" }));
    joinAttractionQueue(state, prop, bus, attraction, ["cust-a"], null);
    joinAttractionQueue(state, prop, bus, attraction, ["cust-b"], null);
    ensureAttractionQueueProgress(state, prop, bus); // starts a solo session with cust-a; cust-b stays queued
    joinAttractionQueue(state, prop, bus, attraction, ["cust-c"], null); // also queued, behind cust-b

    saveService.save(state);
    const loaded = saveService.load(state.saveId);

    expect(loaded).not.toBeNull();
    const loadedProp = activeProperty(loaded!);
    expect(loadedProp.attractions).toEqual(prop.attractions);
  });
});

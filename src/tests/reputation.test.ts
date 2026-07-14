import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { EventBus } from "@/simulation/events/EventBus";
import {
  updateReputation,
  reputationDailyChange,
  reputationWeeklyChange,
  reputationDemandMultiplier,
} from "@/simulation/engine/reputation";
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { DailyReport } from "@/types";

function report(overrides: Partial<DailyReport> = {}): DailyReport {
  return {
    gameDay: 1,
    customerCount: 20,
    groupCount: 10,
    revenue: 10_000,
    salesByProduct: [],
    cogs: 3_000,
    grossProfit: 7_000,
    payrollAccrued: 1_000,
    operatingExpenses: 2_000,
    netProfit: 5_000,
    averageSatisfaction: 60,
    averageWaitMinutes: 10,
    customersLost: 0,
    lossReasons: {},
    inventoryConsumedUnits: 0,
    inventoryWastedUnits: 0,
    attractionSessionsCompletedToday: 0,
    ...overrides,
  };
}

describe("reputation", () => {
  it("moves the score down after a bad day, but only by a bounded/damped amount", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const startingScore = prop.reputation.score;

    updateReputation(
      state,
      prop,
      new EventBus(),
      report({ averageWaitMinutes: 40, averageSatisfaction: 20, customersLost: 15, lossReasons: { wait_too_long: 10, price_too_high: 5 } }),
    );

    expect(prop.reputation.score).toBeLessThan(startingScore);
    expect(startingScore - prop.reputation.score).toBeLessThan(3);
  });

  it("moves the score up after a good day", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const startingScore = prop.reputation.score;

    updateReputation(state, prop, new EventBus(), report({ averageWaitMinutes: 3, averageSatisfaction: 90, customersLost: 0 }));

    expect(prop.reputation.score).toBeGreaterThan(startingScore);
  });

  it("never leaves the 0-100 bounds even after many consecutive bad days", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    for (let day = 1; day <= 60; day++) {
      state.gameDay = day;
      updateReputation(
        state,
        prop,
        new EventBus(),
        report({
          gameDay: day,
          averageWaitMinutes: 60,
          averageSatisfaction: 5,
          customersLost: 20,
          lossReasons: { removed_intoxication: 20 },
        }),
      );
    }
    expect(prop.reputation.score).toBeGreaterThanOrEqual(0);
    expect(prop.reputation.score).toBeLessThanOrEqual(100);
  });

  it("records positive/negative factor labels and derives daily/weekly change from history", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    updateReputation(state, prop, new EventBus(), report({ gameDay: 1, averageSatisfaction: 90, averageWaitMinutes: 2, customersLost: 0 }));
    updateReputation(
      state,
      prop,
      new EventBus(),
      report({ gameDay: 2, averageSatisfaction: 10, averageWaitMinutes: 50, customersLost: 10, lossReasons: { wait_too_long: 10 } }),
    );

    expect(prop.reputation.history).toHaveLength(2);
    expect(prop.reputation.history[0].positiveFactors.length).toBeGreaterThan(0);
    expect(prop.reputation.history[1].negativeFactors.length).toBeGreaterThan(0);
    expect(reputationDailyChange(prop)).toBeLessThan(0);
    expect(reputationWeeklyChange(prop)).toBeLessThan(0);
  });

  it("maps score to a bounded demand multiplier that increases with reputation", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    prop.reputation.score = 0;
    const low = reputationDemandMultiplier(prop);
    prop.reputation.score = 50;
    const mid = reputationDemandMultiplier(prop);
    prop.reputation.score = 100;
    const high = reputationDemandMultiplier(prop);

    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    expect(mid).toBeCloseTo(1.0, 5);
  });
});

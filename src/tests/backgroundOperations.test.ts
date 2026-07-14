import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { EventBus } from "@/simulation/events/EventBus";
import { activeProperty } from "@/simulation/engine/activeProperty";
import { computeBackgroundEstimateProfile, runBackgroundPropertyDay } from "@/simulation/engine/backgroundOperations";
import type { DailyReport, GameState, OwnedPropertyState } from "@/types";

function setup(): { state: GameState; prop: OwnedPropertyState; bus: EventBus } {
  const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
  return { state, prop: activeProperty(state), bus: new EventBus() };
}

function fakeReport(overrides: Partial<DailyReport>): DailyReport {
  return {
    gameDay: 1,
    customerCount: 10,
    groupCount: 5,
    revenue: 10000,
    salesByProduct: [],
    cogs: 3000,
    grossProfit: 7000,
    payrollAccrued: 0,
    operatingExpenses: 0,
    netProfit: 7000,
    averageSatisfaction: 70,
    averageWaitMinutes: 5,
    customersLost: 0,
    lossReasons: {},
    inventoryConsumedUnits: 20,
    inventoryWastedUnits: 0,
    attractionSessionsCompletedToday: 0,
    ...overrides,
  };
}

describe("computeBackgroundEstimateProfile", () => {
  it("returns a zero-sample profile for a property with no daily reports yet", () => {
    const { prop } = setup();
    const profile = computeBackgroundEstimateProfile(prop, 5);
    expect(profile.sampleDayCount).toBe(0);
    expect(profile.averageDailyRevenue).toBe(0);
    expect(profile.averageDailyCogs).toBe(0);
  });

  it("averages the trailing days' revenue/cogs/customerCount/inventoryConsumedUnits", () => {
    const { prop } = setup();
    prop.dailyReports.push(
      fakeReport({ gameDay: 1, revenue: 10000, cogs: 3000, customerCount: 10, inventoryConsumedUnits: 20 }),
      fakeReport({ gameDay: 2, revenue: 20000, cogs: 5000, customerCount: 20, inventoryConsumedUnits: 40 }),
    );
    const profile = computeBackgroundEstimateProfile(prop, 3);
    expect(profile.sampleDayCount).toBe(2);
    expect(profile.averageDailyRevenue).toBe(15000);
    expect(profile.averageDailyCogs).toBe(4000);
    expect(profile.averageDailyCustomerCount).toBe(15);
    expect(profile.averageDailyInventoryConsumedUnits).toBe(30);
  });

  it("only draws from the most recent trailing window (7 days), not the full history", () => {
    const { prop } = setup();
    for (let day = 1; day <= 10; day++) {
      // Days 1-3 would drag the average down if included; only days 4-10 (the trailing 7) should count.
      prop.dailyReports.push(fakeReport({ gameDay: day, revenue: day <= 3 ? 0 : 10000, cogs: 0, customerCount: 0, inventoryConsumedUnits: 0 }));
    }
    const profile = computeBackgroundEstimateProfile(prop, 10);
    expect(profile.sampleDayCount).toBe(7);
    expect(profile.averageDailyRevenue).toBe(10000);
  });
});

describe("runBackgroundPropertyDay", () => {
  it("posts nothing and logs a message when there's no trailing history yet", () => {
    const { state, prop, bus } = setup();
    const cashBefore = state.cash;
    runBackgroundPropertyDay(state, prop, bus);
    expect(state.cash).toBe(cashBefore);
    expect(state.ledger.some((e) => e.category === "revenue_background_estimate")).toBe(false);
  });

  it("posts tagged revenue_background_estimate/cogs_background_estimate ledger entries and moves cash accordingly", () => {
    const { state, prop, bus } = setup();
    prop.backgroundEstimate = {
      averageDailyRevenue: 5000,
      averageDailyCogs: 2000,
      averageDailyCustomerCount: 8,
      averageDailyInventoryConsumedUnits: 10,
      sampleDayCount: 3,
      computedAtGameDay: 1,
    };
    const cashBefore = state.cash;

    runBackgroundPropertyDay(state, prop, bus);

    expect(state.cash).toBe(cashBefore + 5000 - 2000);
    const revenueEntry = state.ledger.find((e) => e.category === "revenue_background_estimate");
    const cogsEntry = state.ledger.find((e) => e.category === "cogs_background_estimate");
    expect(revenueEntry?.propertyId).toBe(prop.propertyId);
    expect(revenueEntry?.amount).toBe(5000);
    expect(cogsEntry?.propertyId).toBe(prop.propertyId);
    expect(cogsEntry?.amount).toBe(2000);
  });

  it("draws down inventory proportionally to on-hand share, never below zero", () => {
    const { state, prop, bus } = setup();
    const [itemA, itemB] = prop.inventory;
    itemA.quantityOnHand = 100;
    itemB.quantityOnHand = 0;
    for (const item of prop.inventory.slice(2)) item.quantityOnHand = 0;

    prop.backgroundEstimate = {
      averageDailyRevenue: 0,
      averageDailyCogs: 0,
      averageDailyCustomerCount: 0,
      averageDailyInventoryConsumedUnits: 30,
      sampleDayCount: 3,
      computedAtGameDay: 1,
    };

    runBackgroundPropertyDay(state, prop, bus);

    expect(itemA.quantityOnHand).toBeCloseTo(70, 5);
    expect(itemB.quantityOnHand).toBe(0);
    for (const item of prop.inventory) expect(item.quantityOnHand).toBeGreaterThanOrEqual(0);
  });
});

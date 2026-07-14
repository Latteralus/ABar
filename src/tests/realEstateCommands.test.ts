import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { activeProperty, findOwnedProperty } from "@/simulation/engine/activeProperty";
import { getProperty, STARTER_PROPERTY } from "@/data/properties";
import { REAL_ESTATE_CONFIG } from "@/config/realEstateConfig";
import { getAttractionCatalogEntryForCategory } from "@/data/attractions/attractionCatalog";
import type { GameState } from "@/types";

function setup(cash?: number): { state: GameState; bus: EventBus } {
  const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
  if (cash !== undefined) state.cash = cash;
  return { state, bus: new EventBus() };
}

describe("leaseOrBuyProperty", () => {
  it("leases a new property without touching cash", () => {
    const { state, bus } = setup(100_000_00);
    const cashBefore = state.cash;
    const result = commandService.leaseOrBuyProperty(state, bus, "property-backstreet-tap", "lease");

    expect(result.success).toBe(true);
    expect(state.cash).toBe(cashBefore);
    expect(state.properties).toHaveLength(2);
    const newProp = findOwnedProperty(state, "property-backstreet-tap");
    expect(newProp?.acquisitionType).toBe("lease");
    // Newly acquired properties are not made active automatically.
    expect(state.activePropertyId).toBe(STARTER_PROPERTY.id);
  });

  it("buys a new property outright, debiting the purchase price", () => {
    const { state, bus } = setup(100_000_00);
    const cashBefore = state.cash;
    const catalogEntry = getProperty("property-backstreet-tap");
    const result = commandService.leaseOrBuyProperty(state, bus, "property-backstreet-tap", "buy");

    expect(result.success).toBe(true);
    expect(state.cash).toBe(cashBefore - catalogEntry.purchasePrice);
    expect(findOwnedProperty(state, "property-backstreet-tap")?.acquisitionType).toBe("buy");
  });

  it("rejects buying without enough cash", () => {
    const { state, bus } = setup(100_00); // $100, nowhere near enough
    const result = commandService.leaseOrBuyProperty(state, bus, "property-backstreet-tap", "buy");

    expect(result.success).toBe(false);
    expect(state.properties).toHaveLength(1);
  });

  it("rejects acquiring a property that's already owned", () => {
    const { state, bus } = setup(100_000_00);
    const result = commandService.leaseOrBuyProperty(state, bus, STARTER_PROPERTY.id, "lease");

    expect(result.success).toBe(false);
    expect(state.properties).toHaveLength(1);
  });

  it("gives the new property its own independent, freshly stocked-empty operational state", () => {
    const { state, bus } = setup(100_000_00);
    commandService.leaseOrBuyProperty(state, bus, "property-backstreet-tap", "lease");
    const newProp = findOwnedProperty(state, "property-backstreet-tap")!;

    expect(newProp.employees).toHaveLength(0);
    expect(newProp.customers).toHaveLength(0);
    expect(newProp.equipment.length).toBeGreaterThan(0); // starts with its own catalog existingEquipment
    expect(newProp.menu.every((m) => !m.isActive)).toBe(true);
  });
});

describe("switchActiveProperty", () => {
  it("rejects switching mid-day (only between_days)", () => {
    const { state, bus } = setup(100_000_00);
    commandService.leaseOrBuyProperty(state, bus, "property-backstreet-tap", "lease");
    state.dayState = "open";

    const result = commandService.switchActiveProperty(state, bus, "property-backstreet-tap");
    expect(result.success).toBe(false);
    expect(state.activePropertyId).toBe(STARTER_PROPERTY.id);
  });

  it("rejects switching to a property not owned", () => {
    const { state, bus } = setup(100_000_00);
    const result = commandService.switchActiveProperty(state, bus, "property-the-meridian-room");
    expect(result.success).toBe(false);
  });

  it("rejects switching to the already-active property", () => {
    const { state, bus } = setup(100_000_00);
    const result = commandService.switchActiveProperty(state, bus, STARTER_PROPERTY.id);
    expect(result.success).toBe(false);
  });

  it("snapshots a backgroundEstimate on the outgoing property and flips activePropertyId", () => {
    const { state, bus } = setup(100_000_00);
    commandService.leaseOrBuyProperty(state, bus, "property-backstreet-tap", "lease");
    state.gameDay = 5;

    const result = commandService.switchActiveProperty(state, bus, "property-backstreet-tap");
    expect(result.success).toBe(true);
    expect(state.activePropertyId).toBe("property-backstreet-tap");

    const outgoing = findOwnedProperty(state, STARTER_PROPERTY.id)!;
    expect(outgoing.backgroundEstimate).toBeDefined();
    expect(outgoing.backgroundEstimate?.computedAtGameDay).toBe(5);
    expect(outgoing.lastActiveGameDay).toBe(5);
  });
});

describe("endLeaseOrSellProperty", () => {
  it("rejects closing out the only owned property", () => {
    const { state, bus } = setup(100_000_00);
    const result = commandService.endLeaseOrSellProperty(state, bus, STARTER_PROPERTY.id);
    expect(result.success).toBe(false);
    expect(state.properties).toHaveLength(1);
  });

  it("rejects closing out the currently active property", () => {
    const { state, bus } = setup(100_000_00);
    commandService.leaseOrBuyProperty(state, bus, "property-backstreet-tap", "lease");
    const result = commandService.endLeaseOrSellProperty(state, bus, STARTER_PROPERTY.id);
    expect(result.success).toBe(false);
    expect(state.properties).toHaveLength(2);
  });

  it("liquidates equipment/attractions for a leased (non-active) property without a property resale bonus", () => {
    const { state, bus } = setup(100_000_00);
    commandService.leaseOrBuyProperty(state, bus, "property-backstreet-tap", "lease");
    const prop = findOwnedProperty(state, "property-backstreet-tap")!;
    const equipmentValue = prop.equipment.reduce((sum, e) => sum + e.purchasePrice, 0);
    const cashBefore = state.cash;

    const result = commandService.endLeaseOrSellProperty(state, bus, "property-backstreet-tap");

    expect(result.success).toBe(true);
    expect(state.properties).toHaveLength(1);
    const expectedProceeds = Math.round(equipmentValue * REAL_ESTATE_CONFIG.equipmentAttractionResalePercent);
    expect(state.cash).toBe(cashBefore + expectedProceeds);
  });

  it("adds the property's own resale value on top of equipment/attraction liquidation when bought outright", () => {
    const { state, bus } = setup(100_000_00);
    commandService.leaseOrBuyProperty(state, bus, "property-backstreet-tap", "buy");
    const prop = findOwnedProperty(state, "property-backstreet-tap")!;
    const catalogEntry = getProperty("property-backstreet-tap");
    const equipmentValue = prop.equipment.reduce((sum, e) => sum + e.purchasePrice, 0);
    const attractionValue = prop.attractions.reduce((sum, a) => sum + getAttractionCatalogEntryForCategory(a.category).purchasePrice, 0);
    const cashBefore = state.cash;

    const result = commandService.endLeaseOrSellProperty(state, bus, "property-backstreet-tap");

    expect(result.success).toBe(true);
    const expectedLiquidation = Math.round((equipmentValue + attractionValue) * REAL_ESTATE_CONFIG.equipmentAttractionResalePercent);
    const expectedResale = Math.round(catalogEntry.purchasePrice * REAL_ESTATE_CONFIG.propertyResalePercent);
    expect(state.cash).toBe(cashBefore + expectedLiquidation + expectedResale);
  });

  it("removes the property from state.properties entirely", () => {
    const { state, bus } = setup(100_000_00);
    commandService.leaseOrBuyProperty(state, bus, "property-backstreet-tap", "lease");
    commandService.endLeaseOrSellProperty(state, bus, "property-backstreet-tap");
    expect(findOwnedProperty(state, "property-backstreet-tap")).toBeUndefined();
  });
});

describe("integration: buy, switch, and close out", () => {
  it("lets the player operate a second property, switch back, and confirm the first property gets a background estimate", () => {
    const { state, bus } = setup(200_000_00);
    commandService.leaseOrBuyProperty(state, bus, "property-maple-street-public-house", "lease");
    const starterProp = activeProperty(state);
    starterProp.dailyReports.push({
      gameDay: 1,
      customerCount: 5,
      groupCount: 2,
      revenue: 8000,
      salesByProduct: [],
      cogs: 2000,
      grossProfit: 6000,
      payrollAccrued: 0,
      operatingExpenses: 0,
      netProfit: 6000,
      averageSatisfaction: 70,
      averageWaitMinutes: 5,
      customersLost: 0,
      lossReasons: {},
      inventoryConsumedUnits: 10,
      inventoryWastedUnits: 0,
      attractionSessionsCompletedToday: 0,
    });

    commandService.switchActiveProperty(state, bus, "property-maple-street-public-house");
    expect(state.activePropertyId).toBe("property-maple-street-public-house");

    const backgroundStarter = findOwnedProperty(state, STARTER_PROPERTY.id)!;
    expect(backgroundStarter.backgroundEstimate?.sampleDayCount).toBe(1);
    expect(backgroundStarter.backgroundEstimate?.averageDailyRevenue).toBe(8000);

    commandService.switchActiveProperty(state, bus, STARTER_PROPERTY.id);
    expect(state.activePropertyId).toBe(STARTER_PROPERTY.id);
  });
});

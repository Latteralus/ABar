import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { EventBus } from "@/simulation/events/EventBus";
import { getProperty } from "@/data/properties";
import { applySpoilage, getStorageUsage } from "@/simulation/engine/spoilage";
import { openDay } from "@/simulation/engine/dayCycle";
import { commandService } from "@/services/commandService";

const LIME_ID = "inv-lime-garnish"; // shelf life: 3 operating days

function setup() {
  const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
  const bus = new EventBus();
  const property = getProperty(state.propertyId);
  return { state, bus, property };
}

describe("applySpoilage", () => {
  it("spoils the entire remaining pool once shelf life is reached and posts cogs_spoilage", () => {
    const { state, bus, property } = setup();
    const lime = state.inventory.find((i) => i.id === LIME_ID)!;
    lime.quantityOnHand = 50;
    lime.daysSinceLastRestock = 2; // one day away from the 3-day shelf life

    const wasted = applySpoilage(state, bus, property);

    expect(lime.quantityOnHand).toBe(0);
    expect(wasted).toBe(50);
    const spoilageEntry = state.ledger.find((e) => e.category === "cogs_spoilage");
    expect(spoilageEntry?.amount).toBe(50 * lime.averageUnitCost);
  });

  it("does not spoil stock that is still within shelf life", () => {
    const { state, bus, property } = setup();
    const lime = state.inventory.find((i) => i.id === LIME_ID)!;
    lime.quantityOnHand = 50;
    lime.daysSinceLastRestock = 0;

    applySpoilage(state, bus, property);

    expect(lime.quantityOnHand).toBe(50);
    expect(state.ledger.find((e) => e.category === "cogs_spoilage")).toBeUndefined();
  });

  it("shortens effective shelf life for items in an over-capacity storage pool", () => {
    const { state, bus, property } = setup();
    // Remove all refrigerator equipment so refrigerated capacity is 0 — any stock is "over capacity".
    state.equipment = state.equipment.filter((e) => e.category !== "refrigerator");

    const lime = state.inventory.find((i) => i.id === LIME_ID)!;
    lime.quantityOnHand = 50;
    lime.daysSinceLastRestock = 1; // would NOT spoil under normal 3-day shelf life

    applySpoilage(state, bus, property);

    // Improper storage halves the 3-day shelf life to 1.5 days; day 1 -> 2 clears that bar.
    expect(lime.quantityOnHand).toBe(0);
  });

  it("resets the age counter when a delivery restocks the item", () => {
    const { state, bus } = setup();
    const lime = state.inventory.find((i) => i.id === LIME_ID)!;
    lime.daysSinceLastRestock = 2;

    state.purchaseOrders.push({
      id: "po-1",
      orderNumber: 1,
      orderedAtGameMinute: 0,
      expectedDeliveryGameMinute: 0,
      lines: [{ inventoryItemId: LIME_ID, quantity: 30, unitCost: 10 }],
      totalCost: 300,
      paymentStatus: "paid",
      deliveryStatus: "pending",
    });

    openDay(state, bus);

    expect(lime.daysSinceLastRestock).toBe(0);
  });
});

describe("getStorageUsage", () => {
  it("adds owned, usable storage_shelving capacity to the general pool", () => {
    const { state, bus, property } = setup();
    const before = getStorageUsage(state, property).general.capacity;

    commandService.purchaseEquipment(state, bus, "equip-storage-shelving");
    const after = getStorageUsage(state, property).general.capacity;

    expect(after).toBe(before + 250);
  });

  it("does not count a failed refrigerator's capacity toward the refrigerated pool", () => {
    const { state, property } = setup();
    const fridge = state.equipment.find((e) => e.category === "refrigerator")!;
    const before = getStorageUsage(state, property).refrigerated.capacity;
    fridge.currentStatus = "failed";

    expect(getStorageUsage(state, property).refrigerated.capacity).toBe(before - (fridge.capacity ?? 0));
  });
});

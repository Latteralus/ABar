import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { EQUIPMENT_CATALOG, effectiveSeatingCapacity, isUpgradeForOwnedEquipment, usedEquipmentSpace } from "@/data/equipment/equipmentCatalog";
import { getProperty } from "@/data/properties";

describe("expanded equipment catalog", () => {
  it("includes realistic bar equipment beyond the original three items", () => {
    const ids = EQUIPMENT_CATALOG.map((e) => e.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "equip-microwave",
        "equip-countertop-fryer",
        "equip-floor-fryer",
        "equip-six-tap-draft",
        "equip-walk-in-cooler",
      ]),
    );
  });

  it("purchases equipment with space and tier metadata", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: true });
    const result = commandService.purchaseEquipment(state, new EventBus(), "equip-microwave");

    expect(result.success).toBe(true);
    const microwave = state.equipment.find((e) => e.name === "Commercial Microwave");
    expect(microwave?.spaceUnits).toBe(4);
    expect(microwave?.tier).toBe(1);
  });

  it("blocks purchases that exceed equipment floor space", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: true });
    const property = getProperty(state.propertyId);
    state.equipment = [{ ...state.equipment[0], spaceUnits: property.equipmentFloorSpaceUnits }];

    const result = commandService.purchaseEquipment(state, new EventBus(), "equip-microwave");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/equipment space/i);
  });

  it("identifies higher-tier same-category items as upgrades", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const premiumBar = EQUIPMENT_CATALOG.find((e) => e.id === "equip-bar-station-premium")!;

    expect(isUpgradeForOwnedEquipment(state, premiumBar)).toBe(true);
    expect(usedEquipmentSpace(state)).toBeGreaterThan(0);
  });

  it("includes purchasable table and bar_stool seating", () => {
    const ids = EQUIPMENT_CATALOG.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(["equip-extra-dining-table", "equip-extra-bar-stools"]));
  });
});

describe("effectiveSeatingCapacity", () => {
  it("returns the property's base numbers when no table/bar_stool equipment is owned", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const property = getProperty(state.propertyId);

    const seating = effectiveSeatingCapacity(state, property);

    expect(seating).toEqual({
      barSeatingSlots: property.barSeatingSlots,
      tableSeatingSlots: property.tableSeatingSlots,
      seatingCapacity: property.seatingCapacity,
      customerCapacity: property.customerCapacity,
    });
  });

  it("adds owned table/bar_stool capacity to both seating and total customer capacity", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: true });
    const property = getProperty(state.propertyId);
    commandService.purchaseEquipment(state, new EventBus(), "equip-extra-dining-table");
    commandService.purchaseEquipment(state, new EventBus(), "equip-extra-bar-stools");

    const seating = effectiveSeatingCapacity(state, property);

    expect(seating.tableSeatingSlots).toBe(property.tableSeatingSlots + 4);
    expect(seating.barSeatingSlots).toBe(property.barSeatingSlots + 4);
    expect(seating.seatingCapacity).toBe(property.seatingCapacity + 8);
    expect(seating.customerCapacity).toBe(property.customerCapacity + 8);
  });

  it("ignores a broken table/bar_stool — a broken one doesn't seat anyone", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: true });
    const property = getProperty(state.propertyId);
    commandService.purchaseEquipment(state, new EventBus(), "equip-extra-dining-table");
    state.equipment.find((e) => e.category === "table")!.currentStatus = "failed";

    expect(effectiveSeatingCapacity(state, property).tableSeatingSlots).toBe(property.tableSeatingSlots);
  });
});

import { describe, expect, it } from "vitest";
import { PROPERTY_CATALOG, STARTER_PROPERTY, getProperty } from "@/data/properties";

describe("property catalog", () => {
  it("has 4 entries: the starter plus 3 ladder properties", () => {
    expect(PROPERTY_CATALOG).toHaveLength(4);
  });

  it("every property has a unique id", () => {
    const ids = PROPERTY_CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getProperty resolves all 4 catalog entries", () => {
    for (const property of PROPERTY_CATALOG) {
      expect(getProperty(property.id)).toBe(property);
    }
  });

  it("getProperty throws for an unknown id", () => {
    expect(() => getProperty("property-does-not-exist")).toThrow();
  });

  it("ladders purchase price and customer capacity from cheapest to most expensive", () => {
    const sortedByPrice = [...PROPERTY_CATALOG].sort((a, b) => a.purchasePrice - b.purchasePrice);
    const sortedByCapacity = [...PROPERTY_CATALOG].sort((a, b) => a.customerCapacity - b.customerCapacity);
    expect(sortedByPrice.map((p) => p.id)).toEqual(sortedByCapacity.map((p) => p.id));
  });

  it("the starter property's neighborhood profile is unchanged (traffic 45 / competition 35)", () => {
    expect(STARTER_PROPERTY.neighborhood.trafficLevel).toBe(45);
    expect(STARTER_PROPERTY.neighborhood.competitionLevel).toBe(35);
  });

  it("Backstreet Tap has no starter fridge, forcing an early purchase", () => {
    const backstreetTap = getProperty("property-backstreet-tap");
    expect(backstreetTap.existingEquipment.some((e) => e.category === "refrigerator")).toBe(false);
  });
});

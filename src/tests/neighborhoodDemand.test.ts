import { describe, expect, it } from "vitest";
import { neighborhoodDemandMultiplier, neighborhoodIncomeBudgetMultiplier, neighborhoodPriceSensitivityDelta } from "@/simulation/engine/neighborhood";
import { generateCustomer } from "@/simulation/engine/customerFactory";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { getProperty, STARTER_PROPERTY } from "@/data/properties";

describe("neighborhoodDemandMultiplier", () => {
  it("is exactly 1.0 for the starter property (anchored no-op)", () => {
    expect(neighborhoodDemandMultiplier(STARTER_PROPERTY)).toBe(1);
  });

  it("computes the ladder properties' multipliers", () => {
    // trafficFactor = 1 + (traffic - 45) * 0.012; competitionFactor = 1 - (competition - 35) * 0.012.
    expect(neighborhoodDemandMultiplier(getProperty("property-backstreet-tap"))).toBeCloseTo(0.8968, 5); // traffic 25, competition 20
    expect(neighborhoodDemandMultiplier(getProperty("property-maple-street-public-house"))).toBeCloseTo(1.1656, 5); // traffic 65, competition 40
    expect(neighborhoodDemandMultiplier(getProperty("property-the-meridian-room"))).toBeCloseTo(0.7084, 5); // traffic 90, competition 80
  });

  it("higher traffic raises demand and higher competition lowers it", () => {
    const highTraffic = getProperty("property-the-meridian-room"); // traffic 90, competition 80
    const lowTraffic = getProperty("property-backstreet-tap"); // traffic 25, competition 20
    expect(neighborhoodDemandMultiplier(highTraffic)).toBeLessThan(neighborhoodDemandMultiplier(lowTraffic));
  });
});

describe("neighborhood income effects on generated customers", () => {
  it("scales spending budget by neighborhood income level", () => {
    expect(neighborhoodIncomeBudgetMultiplier("low")).toBeLessThan(neighborhoodIncomeBudgetMultiplier("middle"));
    expect(neighborhoodIncomeBudgetMultiplier("high")).toBeGreaterThan(neighborhoodIncomeBudgetMultiplier("middle"));
  });

  it("adjusts price sensitivity (tolerance) by neighborhood income level", () => {
    expect(neighborhoodPriceSensitivityDelta("low")).toBeLessThan(0);
    expect(neighborhoodPriceSensitivityDelta("middle")).toBe(0);
    expect(neighborhoodPriceSensitivityDelta("high")).toBeGreaterThan(0);
  });

  it("generateCustomer produces a richer, more price-tolerant customer in a high-income neighborhood than a low-income one", () => {
    // A fixed-seed RNG picks the same archetype/name/variance roll for both calls, isolating the neighborhood effect.
    const lowRng = new SeededRandom(42);
    const highRng = new SeededRandom(42);
    const lowIncomeCustomer = generateCustomer(lowRng, 0, null, "low");
    const highIncomeCustomer = generateCustomer(highRng, 0, null, "high");

    expect(highIncomeCustomer.spendingBudget).toBeGreaterThan(lowIncomeCustomer.spendingBudget);
    expect(highIncomeCustomer.priceSensitivity).toBeGreaterThan(lowIncomeCustomer.priceSensitivity);
  });

  it("clamps priceSensitivity to the 0-100 range", () => {
    const rng = new SeededRandom(7);
    const customer = generateCustomer(rng, 0, null, "high");
    expect(customer.priceSensitivity).toBeLessThanOrEqual(100);
    expect(customer.priceSensitivity).toBeGreaterThanOrEqual(0);
  });
});

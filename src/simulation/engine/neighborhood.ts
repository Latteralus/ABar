import type { IncomeLevel, Property } from "@/types";

/**
 * Anchored so the starter property's own profile (traffic 45, competition 35) yields exactly
 * 1.0x — wiring this in is a provable no-op for the starter/every existing save (Real
 * Estate/Neighborhoods).
 */
const NEIGHBORHOOD_DEMAND_CONFIG = {
  trafficBaselineLevel: 45,
  trafficSlopePerPoint: 0.012,
  competitionBaselineLevel: 35,
  competitionSlopePerPoint: 0.012,
};

/** Combined traffic/competition multiplier on arrival demand for a property (Master Plan's neighborhood traffic model). */
export function neighborhoodDemandMultiplier(property: Property): number {
  const { trafficLevel, competitionLevel } = property.neighborhood;
  const trafficFactor =
    1 + (trafficLevel - NEIGHBORHOOD_DEMAND_CONFIG.trafficBaselineLevel) * NEIGHBORHOOD_DEMAND_CONFIG.trafficSlopePerPoint;
  const competitionFactor =
    1 - (competitionLevel - NEIGHBORHOOD_DEMAND_CONFIG.competitionBaselineLevel) * NEIGHBORHOOD_DEMAND_CONFIG.competitionSlopePerPoint;
  return trafficFactor * competitionFactor;
}

const INCOME_BUDGET_MULTIPLIER: Record<IncomeLevel, number> = { low: 0.75, middle: 1.0, high: 1.35 };
const INCOME_PRICE_SENSITIVITY_DELTA: Record<IncomeLevel, number> = { low: -10, middle: 0, high: 10 };

/** How much more/less a customer arriving from this neighborhood's average income can afford to spend, relative to their archetype's own budget. */
export function neighborhoodIncomeBudgetMultiplier(income: IncomeLevel): number {
  return INCOME_BUDGET_MULTIPLIER[income];
}

/** Signed delta applied to a customer's archetype priceSensitivity — a high-income neighborhood produces customers who notice price less (higher tolerance = higher priceSensitivity in this codebase's convention). */
export function neighborhoodPriceSensitivityDelta(income: IncomeLevel): number {
  return INCOME_PRICE_SENSITIVITY_DELTA[income];
}

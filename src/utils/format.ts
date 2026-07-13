import type { InventoryUnit } from "@/types";

/** Units that represent a continuous, measured quantity (poured/weighed) rather than a count of discrete items. */
const CONTINUOUS_UNITS: ReadonlySet<InventoryUnit> = new Set(["ounce", "fluid_ounce", "pound", "keg"]);

/**
 * Display-only rounding for inventory quantities. Waste/skill math produces long floats
 * internally (e.g. a bottle count after fractional over-pour waste) — this only cleans up what
 * the player sees; it never touches the underlying state. Continuous units (ounce, fluid_ounce,
 * pound, keg — a keg depletes a little at a time, one pour at a time) get up to 2 decimal places;
 * discrete units (bottle, case, serving, unit, portion) round to a whole number, since "0.3
 * bottles" isn't a thing a bar manager reads.
 */
export function formatQuantity(value: number, unit: InventoryUnit): string {
  if (CONTINUOUS_UNITS.has(unit)) {
    return String(Math.round(value * 100) / 100);
  }
  return String(Math.round(value));
}

/** Display-only rounding for 0-100 gameplay stats (condition, cleanliness, ...) where the underlying value is intentionally fractional. */
export function formatPercent(value: number): string {
  return String(Math.round(value));
}

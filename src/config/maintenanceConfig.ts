/** Tunable knobs for Stage 4 equipment condition, breakdowns, and repair (Master Plan Section 34). */
export const MAINTENANCE_CONFIG = {
  /** Below this condition, equipment is "degraded" — still usable, but slower and wastier. */
  degradedConditionThreshold: 50,
  /** Flat wear applied to every owned, non-failed equipment item once per operating day. */
  dailyConditionDecay: 1.5,
  /** Extra wear applied to bar_station/cooking_equipment/point_of_sale on each matching task completion. */
  usageConditionDecayPerTask: 0.4,
  /** Per-game-minute chance of an instant failure, at the most-degraded end of the degraded range. Scales down to 0 right at the threshold. */
  maxPerMinuteBreakdownChance: 0.004,
  /** Task-duration multiplier at the most-degraded end of the degraded range (1 + this). */
  speedPenaltyAtZeroCondition: 0.6,
  /** Ingredient-waste multiplier at the most-degraded end of the degraded range (1 + this). */
  wastePenaltyAtZeroCondition: 0.5,
  /** Neutral point for the speedRating multiplier — matches starter equipment's speedRating (see starterProperty.ts), so day-1 equipment behaves exactly as it does today. */
  baselineSpeedRating: 50,
  speedRatingMultiplierFloor: 0.5,
  speedRatingMultiplierCeiling: 1.5,
  employeeRepairBaseDurationMinutes: 20,
  employeeRepairPartsCostCents: 4000,
  contractRepairCostCents: 15000,
  contractRepairDelayDays: 1,
  conditionAfterRepair: 100,
  /** A maintenance_tool item speeds up and cheapens *employee* (not contract) repairs — see maintenanceToolEffects.ts. */
  maintenanceToolDurationMultiplier: 0.7,
  maintenanceToolCostMultiplier: 0.75,
};

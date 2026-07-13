/** Generic knobs shared by every attraction type (pool table today, more later). Per-attraction-type numbers like price/duration/participant limits live in data/attractions/attractionCatalog.ts instead. */
export const ATTRACTION_CONFIG = {
  /** Base per-minute chance an eligible customer/group notices and considers the attraction, before their interest score scales it down. */
  noticeChancePerMinute: 0.05,
  /** Added to `patience * waitToleranceScale` to get how many minutes a queued party will wait before abandoning. */
  waitToleranceBaseMinutes: 5,
  waitToleranceScale: 0.15,
  /** `priceFactor = priceTolerancePenaltyFloor + (1 - priceTolerancePenaltyFloor) * (priceSensitivity / 100)` — priceSensitivity is "higher tolerates higher prices" per types/customer.ts. */
  priceTolerancePenaltyFloor: 0.4,
  /** Interest multiplier for a party whose size fits the table well (2-4) vs. a solo/oversized party. */
  idealGroupSizeInterestMultiplier: 1.15,
  nonIdealGroupSizeInterestMultiplier: 0.85,
  /** Chance per minute a queued or playing participant decides to order another drink (Master Plan-style "additional order probability"). */
  additionalOrderChancePerMinute: 0.04,

  // Condition / breakdown — same shape as maintenanceConfig.ts, kept independent per the instruction not to reuse Equipment.
  degradedConditionThreshold: 50,
  dailyConditionDecay: 1,
  usageConditionDecayPerGame: 1.5,
  maxPerMinuteBreakdownChance: 0.003,
  employeeRepairBaseDurationMinutes: 15,
  employeeRepairPartsCostCents: 3000,
  contractRepairCostCents: 12000,
  contractRepairDelayDays: 1,
  conditionAfterRepair: 100,

  /** A table needs a clean_attraction task after this many completed games, modeling reset/wipe-down between groups. */
  gamesBetweenCleanings: 3,
  cleanTaskDurationMinutes: 3,

  // Satisfaction effects (Master Plan-style "satisfaction values").
  satisfactionGainOnGoodGame: 8,
  satisfactionLossPerConditionPenalty: 6,
  satisfactionLossOnAbandonQueue: 4,
};

/** Tunable knobs for arrival volume, group formation, and wait tolerance. */
export const CUSTOMER_ARRIVAL_CONFIG = {
  /** Base probability that a new arrival attempt happens in a given game minute at neutral demand. */
  baseArrivalChancePerMinute: 0.18,
  /**
   * Demand multiplier by hour-of-day (24h clock). Bar is open 14:00-02:00; hours outside that
   * window are irrelevant but kept for a complete 0-23 curve.
   */
  hourlyDemandMultiplier: {
    14: 0.4,
    15: 0.5,
    16: 0.6,
    17: 0.8,
    18: 1.0,
    19: 1.2,
    20: 1.4,
    21: 1.5,
    22: 1.3,
    23: 1.1,
    0: 0.8,
    1: 0.4,
  } as Record<number, number>,
  groupSizeWeights: [
    { value: 1, weight: 50 },
    { value: 2, weight: 30 },
    { value: 3, weight: 12 },
    { value: 4, weight: 6 },
    { value: 5, weight: 1 },
    { value: 6, weight: 1 },
  ],
};

export const CUSTOMER_BEHAVIOR_CONFIG = {
  /** Base game-minutes a customer will wait for a seat/order before patience runs out, scaled by archetype patience (0-100). */
  baseWaitToleranceMinutes: 8,
  waitToleranceSkillScale: 0.25,
  /** Base spending budget in cents before archetype multiplier. */
  baseSpendingBudgetCents: 3500,

  /**
   * How long a customer spends actively enjoying the drink just delivered before moving on to
   * mingling. Randomized per drink (rng.int(min,max)) so nobody chugs on a fixed timer.
   */
  consumingDurationMinutesRange: [6, 14] as [number, number],
  /**
   * How long a customer socializes — chatting, people-watching, nursing what's left of their
   * drink — before deciding whether to order again or ask for the check. This, combined with
   * consuming time, is what makes a single-drink visit still take ~30-40 minutes rather than
   * ~10, matching "most bar patrons don't grab one drink and immediately leave."
   */
  socializingDurationMinutesRange: [6, 20] as [number, number],
  /** Chance per minute while socializing that a flavor "chatted with..." log line fires. Cosmetic only. */
  socializingFlavorChancePerMinute: 0.08,
  /** Satisfaction gained per minute spent socializing (capped at 100) — small, reflects genuinely enjoying their time out. */
  socializingSatisfactionPerMinute: 0.15,

  /**
   * Probability, evaluated once at the end of the socializing phase (not per-minute), that the
   * customer orders another round — before the reorder-tendency and diminishing-returns factors.
   */
  reorderChanceOnDecision: 0.55,
  /** Each round already ordered this visit multiplies the reorder chance by (1 - this), floored so it never hits zero. */
  reorderDiminishingReturnsPerRound: 0.15,
  reorderDiminishingReturnsFloor: 0.2,
  /** How long a customer lingers — finishing their drink, chatting — after paying before actually walking out. */
  departureLingerMinutes: 3,
  /** Hard cap on rounds ordered in a single visit, regardless of budget or reorder tendency. */
  maxRoundsPerVisit: 8,
  /**
   * Hard ceiling on total time from arrival to asking for the check — once crossed, no further
   * reorder rolls happen no matter how willing the customer would otherwise be. Matches "hang
   * out between 15 minutes and an hour and a half at max."
   */
  maxVisitMinutesBeforeCheck: 90,
  /**
   * Intoxication gained per alcoholic drink (0-100 scale). Deliberately larger than the gap
   * between the service cutoff and the removal threshold below: the cutoff is only checked
   * when a *new* order is taken, so a drink accepted just under the cutoff can still land the
   * customer's resulting intoxication above the removal threshold once it's delivered. If this
   * gap ever shrinks below the per-drink amount, removal becomes practically unreachable.
   */
  intoxicationPerAlcoholicDrink: 15,
  /** Staff stop serving alcohol to a customer at or above this intoxication level (Section 11: "Employees should stop serving customers who exceed service limits"). Non-alcoholic items are still fine. */
  intoxicationServiceCutoff: 80,
  /** Intoxication level at which a customer becomes eligible for removal. */
  intoxicationRemovalThreshold: 85,
};

export const REMOVAL_CONFIG = {
  /** Minutes staff wait after asking an intoxicated customer to leave before resolving whether they cooperated. */
  warnedResolutionMinutes: 2,
  /** Base chance the customer cooperates and leaves on their own after being asked. */
  baseCooperateChance: 0.5,
  /** Added to the cooperate chance if a calm-trait bartender/server is on shift. */
  calmCooperateBonus: 0.2,
  /** Minutes between calling the police and the customer actually being removed. */
  policeResolutionMinutes: 3,
};

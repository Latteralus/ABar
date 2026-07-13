export const REPUTATION_CONFIG = {
  /** Starting score for a new game — perfectly neutral. */
  startingScore: 50,
  /** Fraction of the raw daily factor delta actually applied to the score — keeps any single day from swinging reputation drastically (Master Plan Section 28). */
  dampingFactor: 0.15,
  /** Bounds of the score -> arrival-demand-multiplier curve: 0.6x at score 0, 1.0x at score 50, 1.4x at score 100. */
  demandMultiplierAtZero: 0.6,
  demandMultiplierAtFifty: 1.0,
  demandMultiplierAtHundred: 1.4,
  /** Minutes of average wait beyond which a day counts as a negative wait-time factor. */
  acceptableAverageWaitMinutes: 15,
  /** Equipment currentStatus values counted as an "equipment problems" negative factor. */
  problemEquipmentStatuses: ["failed", "degraded"] as const,
};

/** Tunable knobs for the ambient TV effect — see simulation/engine/tvEffects.ts. */
export const TV_CONFIG = {
  /** Extra minutes added to the consuming/socializing phase-target roll while a TV is operational. */
  dwellTimeBonusMinutes: 4,
  /** Extra satisfaction gained per minute while a TV is operational, on top of the base socializing rate. */
  satisfactionBonusPerMinute: 0.1,
  /** Chance per minute a customer watching TV orders another round — smaller than an attraction's, since watching TV is passive, not an engaged activity. */
  secondaryOrderChancePerMinute: 0.02,
};

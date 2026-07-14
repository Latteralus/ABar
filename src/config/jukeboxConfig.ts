/** Tunable knobs for the jukebox — see simulation/engine/jukeboxEffects.ts. Unlike TV_CONFIG, this
 * also drives a real monetized "pay to play a song" mechanic, not just ambient effects, so these
 * numbers are kept in their own file rather than folded into tvConfig.ts. */
export const JUKEBOX_CONFIG = {
  /** Flat fee charged the instant a customer plays a song — an instant cash transaction like attractionRevenue.collectAttractionFee, not routed through the tab/order pipeline. */
  songFeeCents: 150,
  /** Base per-minute chance an eligible customer decides to pay for a song; scaled by attractionAffinity, the same entertainment-interest signal customerAttractionDecisions.ts uses. */
  chancePerMinuteOfPlayingASong: 0.03,
  /** Extra minutes added to the consuming/socializing phase-target roll while a jukebox is operational — smaller than TV_CONFIG.dwellTimeBonusMinutes since the jukebox's primary value is the song fee, not dwell time. */
  dwellTimeBonusMinutes: 2,
  /** Extra satisfaction gained per minute while a jukebox is operational, on top of the base socializing rate — smaller than TV_CONFIG.satisfactionBonusPerMinute for the same reason. */
  satisfactionBonusPerMinute: 0.05,
  /** One-off satisfaction bump applied the moment a customer actually pays for and plays a song, on top of the passive per-minute trickle above. */
  satisfactionGainOnPlayingASong: 3,
};

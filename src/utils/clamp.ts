/**
 * Clamps to [min, max] and rounds away binary floating-point noise, for 0-100 gameplay stats
 * (satisfaction, intoxication) that get nudged by small increments every game-minute.
 *
 * Rounds to `decimals` places rather than a whole integer on purpose: some of these stats
 * accumulate in small steps (e.g. +0.15 satisfaction per minute while socializing) that need
 * several minutes to add up to a whole point. Rounding to a whole number on every mutation
 * would silently discard that fractional progress every tick and the value could never move —
 * 4 decimal places is enough to kill float drift like `79.20000000000016` while still letting
 * slow accumulation work. Display code should still round to a whole number for the player
 * (see `utils/format.ts`'s `formatPercent`) — this just keeps the *stored* value clean.
 */
export function clampRound(value: number, min = 0, max = 100, decimals = 4): number {
  const clamped = Math.min(max, Math.max(min, value));
  const factor = 10 ** decimals;
  return Math.round(clamped * factor) / factor;
}

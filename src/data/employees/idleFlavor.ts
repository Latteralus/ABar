/** Cosmetic activity-log lines for staff with nothing pressing queued up. `{employee}` is filled in by the caller. Purely flavor — no mechanical effect. */
export const BARTENDER_IDLE_FLAVOR: readonly string[] = [
  "{employee} wiped down the bar.",
  "{employee} polished glassware.",
  "{employee} chatted with a regular.",
  "{employee} straightened up the bottles behind the bar.",
  "{employee} checked the taps.",
];

export const SERVER_IDLE_FLAVOR: readonly string[] = [
  "{employee} checked in on a table.",
  "{employee} chatted with a customer.",
  "{employee} tidied up an empty table.",
  "{employee} refilled the napkin holders.",
];

export const BARBACK_IDLE_FLAVOR: readonly string[] = [
  "{employee} tidied the back bar.",
  "{employee} restacked clean glassware.",
  "{employee} wiped down the service station.",
  "{employee} checked in with the bartender.",
];

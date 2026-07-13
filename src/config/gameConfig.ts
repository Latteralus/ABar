/** Time ratio and operating-day window. Editable without touching simulation logic. */
export const GAME_TIME_CONFIG = {
  /** 1 real second = 1 in-game minute. */
  gameMinutesPerRealMs: 1 / 1000,
  openHour: 14, // 2:00 p.m.
  closeHour: 2, // 2:00 a.m. the next day
  operatingDayLengthMinutes: 12 * 60, // 720
};

/** Simulation engine batching — how often we commit engine state into the React store. */
export const ENGINE_CONFIG = {
  clockTickIntervalMs: 200,
  storeCommitIntervalMs: 250,
};

export const STARTING_CONDITIONS = {
  startingCash: 500000, // $5,000.00 in cents
  startupLoanAmount: 1000000, // $10,000.00 in cents
};

export const SAVE_CONFIG = {
  localStorageKeyPrefix: "abar:save:",
  saveIndexKey: "abar:save-index",
  autosaveSuffix: "__autosave",
};

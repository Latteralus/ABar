/** Tunable knobs for the bar-cleanliness loop (Master Plan Section 22/25: clean_bar/clean_table tasks). */
export const CLEANLINESS_CONFIG = {
  startingCleanliness: 100,
  /** Cleanliness lost each time a drink is served — more traffic, more mess. Tuned so a busy hour (~30-40 drinks) is enough to trip the trigger threshold at least once. */
  decayPerDrinkServed: 1.5,
  /** Multiplies decayPerDrinkServed when the matching washer (glass_washer for drinks, dishwasher for food) is operational — less mess piles up per item served. */
  washerAssistedDecayMultiplier: 0.5,
  /** Below this, an idle eligible employee gets assigned to clean. */
  taskTriggerThreshold: 70,
  /** Cleanliness restored when a clean task finishes. */
  restoreAmount: 35,
  taskDurationGameMinutes: 3,
};

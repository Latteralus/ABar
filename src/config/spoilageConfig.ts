/** Tunable knobs for Stage 3 shelf-life/spoilage (Master Plan Section 16) and storage capacity (Section 15). */
export const SPOILAGE_CONFIG = {
  /** Effective shelf life is multiplied by this when an item's storage pool is over capacity — "improper storage should shorten shelf life." */
  improperStorageShelfLifeMultiplier: 0.5,
};

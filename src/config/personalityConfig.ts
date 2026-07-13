import type { PersonalityTrait } from "@/types";

/** Every trait an employee can be generated with (Master Plan Section 21). */
export const PERSONALITY_TRAIT_POOL: readonly PersonalityTrait[] = [
  "friendly",
  "reserved",
  "efficient",
  "careless",
  "methodical",
  "abrasive",
  "calm",
  "energetic",
  "slow_paced",
  "detail_oriented",
  "impatient",
  "charismatic",
];

export const PERSONALITY_GENERATION_CONFIG = {
  traitCountRange: [1, 2] as [number, number],
};

export interface PersonalityEffect {
  /** Multiplies task duration — below 1 is faster, above 1 is slower. */
  speedMultiplier?: number;
  /** Multiplies ingredient waste during prep — below 1 wastes less. */
  wasteMultiplier?: number;
  /** Flat add/subtract to customer satisfaction whenever this employee delivers service. */
  satisfactionBonus?: number;
  /** Improves the odds an intoxicated customer cooperates instead of needing the police (Section 11). */
  calmBonus?: boolean;
}

/**
 * Concrete, understandable effects per trait (Master Plan Section 21: "Personality should
 * affect performance in understandable ways"). Multiple traits stack multiplicatively for
 * multipliers and additively for flat bonuses.
 */
export const PERSONALITY_EFFECTS: Record<PersonalityTrait, PersonalityEffect> = {
  friendly: { satisfactionBonus: 4 },
  reserved: {},
  efficient: { speedMultiplier: 0.9 },
  careless: { wasteMultiplier: 1.2 },
  methodical: { speedMultiplier: 1.1, wasteMultiplier: 0.9 },
  abrasive: { satisfactionBonus: -5 },
  calm: { calmBonus: true },
  energetic: { speedMultiplier: 0.92 },
  slow_paced: { speedMultiplier: 1.15 },
  detail_oriented: { wasteMultiplier: 0.85 },
  impatient: { wasteMultiplier: 1.1 },
  charismatic: { satisfactionBonus: 3 },
};

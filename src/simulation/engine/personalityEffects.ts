import { PERSONALITY_EFFECTS } from "@/config/personalityConfig";
import type { PersonalityEffect } from "@/config/personalityConfig";
import type { Employee } from "@/types";

/** Folds all of an employee's traits into one combined modifier set (Master Plan Section 21). */
function combinedEffect(employee: Employee): Required<PersonalityEffect> {
  return employee.personality.reduce<Required<PersonalityEffect>>(
    (acc, trait) => {
      const effect = PERSONALITY_EFFECTS[trait];
      return {
        speedMultiplier: acc.speedMultiplier * (effect.speedMultiplier ?? 1),
        wasteMultiplier: acc.wasteMultiplier * (effect.wasteMultiplier ?? 1),
        satisfactionBonus: acc.satisfactionBonus + (effect.satisfactionBonus ?? 0),
        calmBonus: acc.calmBonus || Boolean(effect.calmBonus),
      };
    },
    { speedMultiplier: 1, wasteMultiplier: 1, satisfactionBonus: 0, calmBonus: false },
  );
}

export function personalitySpeedMultiplier(employee: Employee): number {
  return combinedEffect(employee).speedMultiplier;
}

export function personalityWasteMultiplier(employee: Employee): number {
  return combinedEffect(employee).wasteMultiplier;
}

export function personalitySatisfactionBonus(employee: Employee): number {
  return combinedEffect(employee).satisfactionBonus;
}

export function hasCalmBonus(employee: Employee): boolean {
  return combinedEffect(employee).calmBonus;
}

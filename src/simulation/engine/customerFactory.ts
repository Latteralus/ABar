import { CUSTOMER_ARCHETYPES } from "@/data/customers/archetypes";
import { FIRST_NAMES } from "@/data/names/firstNames";
import { LAST_NAMES } from "@/data/names/lastNames";
import { CUSTOMER_BEHAVIOR_CONFIG } from "@/config/customerConfig";
import { createId } from "@/services/idService";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Customer, GameMinute } from "@/types";

export function generateCustomer(rng: SeededRandom, arrivalMinute: GameMinute, groupId: string | null): Customer {
  const archetype = rng.pick(CUSTOMER_ARCHETYPES);
  const budget = Math.round(CUSTOMER_BEHAVIOR_CONFIG.baseSpendingBudgetCents * archetype.budgetMultiplier * rng.float(0.7, 1.3));

  return {
    id: createId("cust"),
    firstName: rng.pick(FIRST_NAMES),
    lastName: rng.pick(LAST_NAMES),
    archetypeId: archetype.id,
    ageGroup: archetype.ageGroup,
    incomeLevel: archetype.incomeLevel,
    spendingBudget: budget,
    preferredCategories: archetype.preferredCategories,
    priceSensitivity: archetype.priceSensitivity,
    patience: archetype.patience,
    reviewTendency: archetype.reviewTendency,
    reorderTendency: archetype.reorderTendency,
    attractionAffinity: archetype.attractionAffinity,
    intoxication: 0,
    satisfaction: 70,
    groupId,
    arrivalGameMinute: arrivalMinute,
    status: "arriving",
    seatId: null,
    tabId: null,
    itemsOrderedCount: 0,
    totalSpent: 0,
    statusEnteredAtGameMinute: arrivalMinute,
  };
}

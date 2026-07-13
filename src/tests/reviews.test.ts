import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import { maybeGenerateReview } from "@/simulation/engine/reviews";
import type { Customer } from "@/types";

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    firstName: "Jamie",
    lastName: "Rivera",
    archetypeId: "archetype-regular",
    ageGroup: "adult",
    incomeLevel: "middle",
    spendingBudget: 5_000,
    preferredCategories: [],
    priceSensitivity: 50,
    patience: 50,
    reviewTendency: 100,
    reorderTendency: 50,
    attractionAffinity: 50,
    intoxication: 0,
    satisfaction: 80,
    groupId: null,
    arrivalGameMinute: 0,
    status: "left",
    seatId: null,
    tabId: null,
    itemsOrderedCount: 1,
    totalSpent: 1_000,
    statusEnteredAtGameMinute: 0,
    ...overrides,
  };
}

describe("reviews", () => {
  it("always generates a review when reviewTendency is 100", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const rng = new SeededRandom(1);
    maybeGenerateReview(state, new EventBus(), rng, customer({ reviewTendency: 100 }));
    expect(state.reviews).toHaveLength(1);
  });

  it("never generates a review when reviewTendency is 0", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const rng = new SeededRandom(1);
    for (let i = 0; i < 20; i++) {
      maybeGenerateReview(state, new EventBus(), rng, customer({ id: `c${i}`, reviewTendency: 0 }));
    }
    expect(state.reviews).toHaveLength(0);
  });

  it("produces a negative price comment for a customer who left specifically over price", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const rng = new SeededRandom(1);
    maybeGenerateReview(state, new EventBus(), rng, customer({ reviewTendency: 100, satisfaction: 85, leaveReason: "price_too_high" }));

    const review = state.reviews[0];
    const negativePricePhrases = ["Prices felt steep.", "A bit overpriced for what you get.", "Wallet took a hit."];
    expect(negativePricePhrases.some((phrase) => review.text.includes(phrase))).toBe(true);
  });

  it("maps satisfaction to a 1-5 star rating", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const rng = new SeededRandom(1);
    maybeGenerateReview(state, new EventBus(), rng, customer({ reviewTendency: 100, satisfaction: 95 }));
    maybeGenerateReview(state, new EventBus(), rng, customer({ id: "c2", reviewTendency: 100, satisfaction: 5 }));

    expect(state.reviews[0].rating).toBe(5);
    expect(state.reviews[1].rating).toBe(1);
  });
});

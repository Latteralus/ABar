export type ReviewTone = "positive" | "neutral" | "negative";

/**
 * Predefined phrase components assembled into a review (Master Plan Section 29 — no AI service).
 * Each component picks from the tone bucket matching the customer's actual experience; the
 * assembled sentence is never randomly mismatched to how the visit actually went.
 */
export const REVIEW_OPENING: Record<ReviewTone, readonly string[]> = {
  positive: ["Loved this place.", "What a great spot.", "Really enjoyed my visit.", "This is now one of my regular spots."],
  neutral: ["Decent bar, nothing fancy.", "An okay night out.", "Solid, if unremarkable.", "Had an average time here."],
  negative: ["Disappointing visit.", "Not what I expected.", "Wouldn't rush back.", "Rough night at this place."],
};

export const REVIEW_SERVICE: Record<ReviewTone, readonly string[]> = {
  positive: ["Service was fast and friendly.", "The staff was attentive all night.", "Never waited long for anything."],
  neutral: ["Service was fine, nothing special.", "Staff got to me eventually.", "Average wait times."],
  negative: ["Waited way too long to get served.", "Staff seemed overwhelmed.", "Service was slow all night."],
};

export const REVIEW_DRINK: Record<ReviewTone, readonly string[]> = {
  positive: ["The drinks were excellent.", "Really well-made cocktails."],
  neutral: ["Drinks were fine.", "Nothing special, but nothing wrong either."],
  negative: ["Drinks were mediocre at best.", "Quality just wasn't there."],
};

/** Only appended when the customer's own tab actually had a food line item (see reviews.ts's assembleReviewText) — otherwise a review would mention food at a bar not serving any. */
export const REVIEW_FOOD: Record<ReviewTone, readonly string[]> = {
  positive: ["Food came out great too."],
  neutral: ["Nothing wrong with the food, nothing special either."],
  negative: ["Wasn't impressed with the food."],
};

export const REVIEW_PRICE: Record<ReviewTone, readonly string[]> = {
  positive: ["Prices were fair for what you get.", "Good value overall.", "Reasonably priced."],
  neutral: ["Prices were about what you'd expect.", "Nothing outrageous, nothing cheap."],
  negative: ["Prices felt steep.", "A bit overpriced for what you get.", "Wallet took a hit."],
};

export const REVIEW_CLEANLINESS: Record<ReviewTone, readonly string[]> = {
  positive: ["Place was clean and well kept.", "Tables were spotless."],
  neutral: ["Place was reasonably clean."],
  negative: ["Could use a good cleaning.", "Tables were a little grimy."],
};

export const REVIEW_CLOSING: Record<ReviewTone, readonly string[]> = {
  positive: ["Will definitely be back.", "Highly recommend.", "Five stars from me."],
  neutral: ["Might come back, might not.", "It's fine for a casual night."],
  negative: ["Probably won't return.", "Wouldn't recommend it.", "Expected better."],
};

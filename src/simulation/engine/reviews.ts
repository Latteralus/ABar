import { createId } from "@/services/idService";
import {
  REVIEW_CLEANLINESS,
  REVIEW_CLOSING,
  REVIEW_DRINK,
  REVIEW_FOOD,
  REVIEW_OPENING,
  REVIEW_PRICE,
  REVIEW_SERVICE,
  type ReviewTone,
} from "@/data/customers/reviewPhrases";
import { getProduct } from "@/data/products/products";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Customer, GameState, OwnedPropertyState } from "@/types";
import { logActivity } from "./activityLogger";

/** Whether this customer's own visit actually included a food item — reviews should only mention food they were served. */
function customerOrderedFood(prop: OwnedPropertyState, customer: Customer): boolean {
  const tab = prop.tabs.find((t) => t.id === customer.tabId);
  if (!tab) return false;
  return tab.lineItems.some((item) => getProduct(item.productId).category === "food");
}

function toneForSatisfaction(satisfaction: number): ReviewTone {
  if (satisfaction >= 70) return "positive";
  if (satisfaction >= 40) return "neutral";
  return "negative";
}

function ratingForSatisfaction(satisfaction: number): number {
  if (satisfaction >= 90) return 5;
  if (satisfaction >= 70) return 4;
  if (satisfaction >= 50) return 3;
  if (satisfaction >= 30) return 2;
  return 1;
}

/** Master Plan Section 29 — assembles review text from the customer's actual visit, not a random mismatch: a customer who left over price gets the negative price line regardless of their overall tone. */
function assembleReviewText(rng: SeededRandom, customer: Customer, cleanliness: number, orderedFood: boolean): string {
  const overallTone = toneForSatisfaction(customer.satisfaction);
  const priceTone: ReviewTone = customer.leaveReason === "price_too_high" ? "negative" : overallTone;
  const serviceTone: ReviewTone = customer.leaveReason === "wait_too_long" ? "negative" : overallTone;
  const cleanlinessTone: ReviewTone = cleanliness < 50 ? "negative" : cleanliness >= 90 ? "positive" : "neutral";

  const sentences = [
    rng.pick(REVIEW_OPENING[overallTone]),
    rng.pick(REVIEW_SERVICE[serviceTone]),
    rng.pick(REVIEW_DRINK[overallTone]),
  ];
  if (orderedFood) sentences.push(rng.pick(REVIEW_FOOD[overallTone]));
  sentences.push(rng.pick(REVIEW_PRICE[priceTone]), rng.pick(REVIEW_CLEANLINESS[cleanlinessTone]), rng.pick(REVIEW_CLOSING[overallTone]));

  return sentences.join(" ");
}

/** Rolls the customer's reviewTendency (Master Plan Section 29); called from customerLifecycle.departCustomer. */
export function maybeGenerateReview(state: GameState, prop: OwnedPropertyState, bus: EventBus, rng: SeededRandom, customer: Customer): void {
  if (!rng.chance(customer.reviewTendency / 100)) return;

  const review = {
    id: createId("review"),
    customerId: customer.id,
    customerName: `${customer.firstName} ${customer.lastName}`,
    rating: ratingForSatisfaction(customer.satisfaction),
    text: assembleReviewText(rng, customer, prop.barCleanliness, customerOrderedFood(prop, customer)),
    gameDay: state.gameDay,
  };
  prop.reviews.push(review);
  logActivity(state, bus, "customer", `${review.customerName} left a ${review.rating}-star review.`);
}

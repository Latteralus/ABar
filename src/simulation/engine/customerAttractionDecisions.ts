import { ATTRACTION_CONFIG } from "@/config/attractionConfig";
import { getAttractionCatalogEntryForCategory, type AttractionCatalogEntry } from "@/data/attractions/attractionCatalog";
import { estimateAttractionWaitMinutes, joinAttractionQueue } from "./attractionQueue";
import { attractionWaitToleranceMinutes } from "./attractionSessions";
import { isAttractionUsable } from "./attractionCondition";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Customer, EntityId, GameState } from "@/types";

/** Statuses "settled in and free to notice things" — not mid-task with staff, not already at an attraction. */
const ATTRACTION_ELIGIBLE_STATUSES = new Set<Customer["status"]>(["seated", "waiting_to_order", "consuming", "deciding_next_order"]);

function isEligible(customer: Customer): boolean {
  return ATTRACTION_ELIGIBLE_STATUSES.has(customer.status);
}

/**
 * Interest may vary by archetype, price sensitivity, and group size (Customer.attractionAffinity
 * is the archetype-driven signal; this codebase has no separate customer "personality" system —
 * only employees have PersonalityTrait — so archetype attributes are the customer-side
 * equivalent). Current visit state is handled by the caller only offering this to eligible
 * statuses in the first place.
 */
function computeAttractionInterest(customer: Customer, partySize: number, catalogEntry: AttractionCatalogEntry): number {
  let score = customer.attractionAffinity / 100;
  score *= ATTRACTION_CONFIG.priceTolerancePenaltyFloor + (1 - ATTRACTION_CONFIG.priceTolerancePenaltyFloor) * (customer.priceSensitivity / 100);
  const idealSize = partySize >= catalogEntry.minParticipants && partySize <= catalogEntry.maxParticipants;
  score *= idealSize ? ATTRACTION_CONFIG.idealGroupSizeInterestMultiplier : ATTRACTION_CONFIG.nonIdealGroupSizeInterestMultiplier;
  return Math.max(0, Math.min(1, score));
}

function considerAttractions(state: GameState, rng: SeededRandom, bus: EventBus, party: Customer[], groupId: EntityId | null): void {
  const representative = party[0];
  for (const attraction of state.attractions) {
    if (!isAttractionUsable(attraction)) continue;
    const catalogEntry = getAttractionCatalogEntryForCategory(attraction.category);
    if (party.length > catalogEntry.maxParticipants) continue; // oversized arrival groups never split to fit a table (documented simplification)

    const priceRatio = catalogEntry.pricePerGameCents > 0 ? attraction.pricePerGameCents / catalogEntry.pricePerGameCents : 1;
    const pricePenalty = priceRatio <= 1 ? 1 : Math.max(0.2, 1 - (priceRatio - 1) * (representative.priceSensitivity / 100));
    const interest = computeAttractionInterest(representative, party.length, catalogEntry) * pricePenalty;
    if (!rng.chance(ATTRACTION_CONFIG.noticeChancePerMinute * interest)) continue;

    const estimatedWait = estimateAttractionWaitMinutes(attraction, catalogEntry.gameDurationMinutes);
    if (estimatedWait > attractionWaitToleranceMinutes(representative.patience)) continue;

    joinAttractionQueue(state, bus, attraction, party.map((c) => c.id), groupId);
    return; // only one attraction exists today, but keep this a "pick one" loop, not "try all of them"
  }
}

/** Steps 1-4 of the attraction lifecycle: notice, decide as a unit (arrival group or solo), check wait tolerance, join or continue the normal visit. */
export function processAttractionDecisions(state: GameState, rng: SeededRandom, bus: EventBus): void {
  if (state.attractions.length === 0) return;

  const decidedGroupIds = new Set<EntityId>();
  for (const customer of state.customers) {
    if (!isEligible(customer)) continue;

    if (customer.groupId) {
      if (decidedGroupIds.has(customer.groupId)) continue;
      decidedGroupIds.add(customer.groupId);
      const group = state.customerGroups.find((g) => g.id === customer.groupId);
      if (!group) continue;
      const members = group.memberIds
        .map((id) => state.customers.find((c) => c.id === id))
        .filter((c): c is Customer => !!c);
      if (members.length === 0 || !members.every(isEligible)) continue; // whole group must be free to decide together
      considerAttractions(state, rng, bus, members, customer.groupId);
    } else {
      considerAttractions(state, rng, bus, [customer], null);
    }
  }
}

/** "Additional order probability" while queued or playing — scaled by the customer's existing reorderTendency archetype attribute. Called from orderProcessing.ensureOrderTasks, which owns actually creating the take_order task. */
export function shouldOrderWhileAtAttraction(rng: SeededRandom, customer: Customer): boolean {
  const chance = ATTRACTION_CONFIG.additionalOrderChancePerMinute * (0.5 + customer.reorderTendency / 100);
  return rng.chance(chance);
}

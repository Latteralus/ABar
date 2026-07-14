import { formatCents } from "@/utils/money";
import type { EventBus } from "@/simulation/events/EventBus";
import type { Attraction, GameState, OwnedPropertyState } from "@/types";
import { logActivity } from "./activityLogger";
import { receiveCash } from "./ledger";

/** Charges the session's total fee (per-participant — see attractionSessions.startAttractionSession, which multiplies `pricePerGameCents` by headcount before calling this). */
export function collectAttractionFee(state: GameState, prop: OwnedPropertyState, bus: EventBus, attraction: Attraction, feeCents: number): void {
  receiveCash(state, feeCents, {
    category: "revenue_attraction",
    description: `${attraction.name} game fee`,
    relatedEntityId: attraction.id,
    propertyId: prop.propertyId,
  });
  logActivity(state, bus, "attraction", `${attraction.name} collected a ${formatCents(feeCents)} game fee.`, "info", attraction.id);
}

/** Running estimate only (see Attraction.estimatedSecondarySalesCents) — incremented when a participant's "order while playing/queued" task is created, not reconciled against the actual paid order. */
export function recordEstimatedSecondarySale(attraction: Attraction, priceCents: number): void {
  attraction.estimatedSecondarySalesCents += priceCents;
}

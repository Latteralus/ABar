import { formatCents } from "@/utils/money";
import type { EventBus } from "@/simulation/events/EventBus";
import type { Attraction, GameState } from "@/types";
import { logActivity } from "./activityLogger";
import { receiveCash } from "./ledger";

/** Charges a flat per-game fee (not per participant — matches "Pool Table 1 collected a $2.00 game fee" regardless of player count). */
export function collectAttractionFee(state: GameState, bus: EventBus, attraction: Attraction, feeCents: number): void {
  receiveCash(state, feeCents, { category: "revenue_attraction", description: `${attraction.name} game fee`, relatedEntityId: attraction.id });
  logActivity(state, bus, "attraction", `${attraction.name} collected a ${formatCents(feeCents)} game fee.`, "info", attraction.id);
}

/** Running estimate only (see Attraction.estimatedSecondarySalesCents) — incremented when a participant's "order while playing/queued" task is created, not reconciled against the actual paid order. */
export function recordEstimatedSecondarySale(attraction: Attraction, priceCents: number): void {
  attraction.estimatedSecondarySalesCents += priceCents;
}

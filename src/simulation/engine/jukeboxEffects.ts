import { JUKEBOX_CONFIG } from "@/config/jukeboxConfig";
import { isEquipmentUsable } from "./equipmentMaintenance";
import { logActivity } from "./activityLogger";
import { receiveCash } from "./ledger";
import { formatCents } from "@/utils/money";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Customer, GameState } from "@/types";

/**
 * A jukebox is ambient equipment, not a bookable Attraction (no queue, nobody "plays a game") —
 * same shape as tvEffects.hasOperationalTv, a binary gate not scaled by count/tier. Unlike TV,
 * though, it drives a real monetized "pay to play a song" mechanic (see processJukeboxSongs
 * below), so this file also owns a direct cash transaction, which tvEffects.ts never needed.
 */
export function hasOperationalJukebox(state: GameState): boolean {
  return state.equipment.some((e) => e.category === "jukebox" && isEquipmentUsable(e));
}

/** Statuses a customer can be in and still be "around" the jukebox to pay for a song. */
const JUKEBOX_ELIGIBLE_STATUSES = new Set<Customer["status"]>(["seated", "waiting_to_order", "consuming", "deciding_next_order"]);

/** Pure per-minute chance roll — scaled by attractionAffinity (entertainment interest), not reorderTendency, since paying for a song is an entertainment choice, not a drink-reorder choice. */
export function shouldPlayASong(rng: SeededRandom, customer: Customer): boolean {
  const chance = JUKEBOX_CONFIG.chancePerMinuteOfPlayingASong * (0.5 + customer.attractionAffinity / 100);
  return rng.chance(chance);
}

/**
 * Rolls every eligible customer once per minute and, on success, charges the flat song fee
 * straight to the ledger (revenue_attraction — the same category collectAttractionFee already
 * uses, not a new one) and applies an immediate satisfaction bump. This is a direct coin-op
 * transaction, not routed through the take_order/tab pipeline, since a song isn't a menu product.
 */
export function processJukeboxSongs(state: GameState, rng: SeededRandom, bus: EventBus): void {
  const jukebox = state.equipment.find((e) => e.category === "jukebox" && isEquipmentUsable(e));
  if (!jukebox) return;

  for (const customer of state.customers) {
    if (!JUKEBOX_ELIGIBLE_STATUSES.has(customer.status)) continue;
    if (!shouldPlayASong(rng, customer)) continue;

    receiveCash(state, JUKEBOX_CONFIG.songFeeCents, {
      category: "revenue_attraction",
      description: `${jukebox.name} song played`,
      relatedEntityId: jukebox.id,
    });
    customer.satisfaction = Math.min(100, customer.satisfaction + JUKEBOX_CONFIG.satisfactionGainOnPlayingASong);
    logActivity(
      state,
      bus,
      "equipment",
      `${customer.firstName} ${customer.lastName} played a song on the ${jukebox.name} for ${formatCents(JUKEBOX_CONFIG.songFeeCents)}.`,
      "info",
      jukebox.id,
    );
  }
}

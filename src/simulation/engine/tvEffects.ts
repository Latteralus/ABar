import { TV_CONFIG } from "@/config/tvConfig";
import { isEquipmentUsable } from "./equipmentMaintenance";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Customer, GameState } from "@/types";

/**
 * TVs are an ambient amenity, not an exclusive activity like pool (no queue, no per-use fee,
 * everyone in the room benefits just from one being on) — so unlike Attractions this is a binary
 * gate, not scaled by how many TVs are owned or their tier. Reuses Equipment's condition/repair
 * machinery wholesale (see equipmentMaintenance.ts) since a TV is mechanically just equipment;
 * this file only owns the customer-facing effect.
 */
export function hasOperationalTv(state: GameState): boolean {
  return state.equipment.some((e) => e.category === "tv" && isEquipmentUsable(e));
}

/** Chance per minute a customer already consuming/socializing near a working TV orders another round — mirrors customerAttractionDecisions.shouldOrderWhileAtAttraction, smaller since watching TV is passive. */
export function shouldOrderWhileWatchingTv(rng: SeededRandom, customer: Customer): boolean {
  const chance = TV_CONFIG.secondaryOrderChancePerMinute * (0.5 + customer.reorderTendency / 100);
  return rng.chance(chance);
}

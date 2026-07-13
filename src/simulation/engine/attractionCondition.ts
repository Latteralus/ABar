import { ATTRACTION_CONFIG } from "@/config/attractionConfig";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Attraction, GameState } from "@/types";
import { logActivity } from "./activityLogger";

/** Only operational/degraded attractions are usable — mirrors equipmentMaintenance.ts's isEquipmentUsable, kept as an independent function/type per the instruction not to reuse Equipment. */
export function isAttractionUsable(attraction: Attraction): boolean {
  return attraction.currentStatus === "operational" || attraction.currentStatus === "degraded";
}

/** Extra wear from actually being played, applied once per completed game. */
export function decayAttractionOnUse(attraction: Attraction): void {
  if (!isAttractionUsable(attraction)) return;
  attraction.condition = Math.max(0, attraction.condition - ATTRACTION_CONFIG.usageConditionDecayPerGame);
}

/** Flat time-based wear for every owned attraction once per operating day, same shape as applyDailyEquipmentWear. */
export function applyDailyAttractionWear(state: GameState, bus: EventBus): void {
  for (const attraction of state.attractions) {
    if (!isAttractionUsable(attraction)) continue;
    const wasOperational = attraction.currentStatus === "operational";
    attraction.condition = Math.max(0, attraction.condition - ATTRACTION_CONFIG.dailyConditionDecay);

    if (attraction.condition < ATTRACTION_CONFIG.degradedConditionThreshold) {
      if (wasOperational) {
        attraction.currentStatus = "degraded";
        logActivity(
          state,
          bus,
          "attraction",
          `${attraction.name} condition dropped below ${ATTRACTION_CONFIG.degradedConditionThreshold}%.`,
          "warning",
          attraction.id,
        );
      }
      if (attraction.condition <= 0) {
        attraction.currentStatus = "failed";
        logActivity(
          state,
          bus,
          "attraction",
          `${attraction.name} was taken out of service due to a damaged cue.`,
          "critical",
          attraction.id,
        );
      }
    }
  }
}

/** Per-minute chance of a degraded attraction failing outright while the bar is open, same shape as processEquipmentWear. */
export function processAttractionWear(state: GameState, rng: SeededRandom, bus: EventBus): void {
  for (const attraction of state.attractions) {
    if (attraction.currentStatus !== "degraded") continue;
    const severity = (ATTRACTION_CONFIG.degradedConditionThreshold - attraction.condition) / ATTRACTION_CONFIG.degradedConditionThreshold;
    const chance = Math.max(0, severity) * ATTRACTION_CONFIG.maxPerMinuteBreakdownChance;
    if (rng.chance(chance)) {
      attraction.currentStatus = "failed";
      logActivity(state, bus, "attraction", `${attraction.name} was taken out of service due to a damaged cue.`, "critical", attraction.id);
      bus.emit("attraction:failed", { attraction });
    }
  }
}

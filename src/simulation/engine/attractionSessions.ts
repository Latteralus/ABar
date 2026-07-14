import { createId } from "@/services/idService";
import { ATTRACTION_CONFIG } from "@/config/attractionConfig";
import { getAttractionCatalogEntryForCategory } from "@/data/attractions/attractionCatalog";
import { clampRound } from "@/utils/clamp";
import { collectAttractionFee } from "./attractionRevenue";
import { decayAttractionOnUse } from "./attractionCondition";
import { logActivity } from "./activityLogger";
import type { EventBus } from "@/simulation/events/EventBus";
import type { Attraction, Customer, EntityId, GameState, OwnedPropertyState } from "@/types";

/** "The Foster group" for a party of 2+, or "Amy Lewis" for a solo customer — matches the example activity-log style. */
export function attractionLabel(prop: OwnedPropertyState, customerIds: EntityId[], groupId: EntityId | null): string {
  const first = prop.customers.find((c) => c.id === customerIds[0]);
  if (!first) return "A customer";
  return groupId ? `The ${first.lastName} group` : `${first.firstName} ${first.lastName}`;
}

function findParticipants(prop: OwnedPropertyState, ids: EntityId[]): Customer[] {
  return ids.map((id) => prop.customers.find((c) => c.id === id)).filter((c): c is Customer => !!c);
}

/** Base wait tolerance in minutes before a queued party abandons — shared by the queue-abandonment check and the satisfaction formula below. Kept as a one-liner rather than a shared helper module to avoid a cross-module import cycle (attractionQueue.ts already depends on this file). */
export function attractionWaitToleranceMinutes(patience: number): number {
  return ATTRACTION_CONFIG.waitToleranceBaseMinutes + patience * ATTRACTION_CONFIG.waitToleranceScale;
}

function priceToleranceFactor(priceSensitivity: number): number {
  return ATTRACTION_CONFIG.priceTolerancePenaltyFloor + (1 - ATTRACTION_CONFIG.priceTolerancePenaltyFloor) * (priceSensitivity / 100);
}

function computeGameSatisfactionDelta(customer: Customer, attraction: Attraction, waitedMinutes: number): number {
  let delta = ATTRACTION_CONFIG.satisfactionGainOnGoodGame;
  delta *= priceToleranceFactor(customer.priceSensitivity);
  delta *= 0.5 + customer.attractionAffinity / 100; // 0.5x-1.5x based on how much this customer actually likes attractions
  if (attraction.condition < ATTRACTION_CONFIG.degradedConditionThreshold) {
    delta -= ATTRACTION_CONFIG.satisfactionLossPerConditionPenalty;
  }
  if (waitedMinutes > attractionWaitToleranceMinutes(customer.patience) * 0.5) {
    delta -= 2;
  }
  return delta;
}

/** Starts a game: collects the fee, locks participants into `using_attraction`, and logs both the start and the fee collection as separate lines (matches the example log style). */
export function startAttractionSession(
  state: GameState,
  prop: OwnedPropertyState,
  bus: EventBus,
  attraction: Attraction,
  customerIds: EntityId[],
  groupId: EntityId | null,
): void {
  const catalogEntry = getAttractionCatalogEntryForCategory(attraction.category);
  attraction.activeSession = {
    id: createId("attrsession"),
    participantIds: customerIds,
    startedAtGameMinute: state.gameMinute,
    remainingGameMinutes: catalogEntry.gameDurationMinutes,
    feeCents: attraction.pricePerGameCents,
  };
  attraction.currentStatus = attraction.currentStatus === "degraded" ? "degraded" : "operational";

  for (const customer of findParticipants(prop, customerIds)) {
    customer.status = "using_attraction";
    customer.statusEnteredAtGameMinute = state.gameMinute;
  }

  const label = attractionLabel(prop, customerIds, groupId);
  logActivity(state, bus, "attraction", `${label} began a game of ${attraction.name.toLowerCase()}.`, "info", attraction.id);
  collectAttractionFee(state, prop, bus, attraction, attraction.pricePerGameCents);
}

function endSession(state: GameState, prop: OwnedPropertyState, bus: EventBus, attraction: Attraction, interrupted: boolean): void {
  const session = attraction.activeSession;
  if (!session) return;

  let totalSatisfactionDelta = 0;
  for (const customer of findParticipants(prop, session.participantIds)) {
    const waitedMinutes = state.gameMinute - session.startedAtGameMinute;
    const delta = interrupted ? 0 : computeGameSatisfactionDelta(customer, attraction, waitedMinutes);
    customer.satisfaction = clampRound(customer.satisfaction + delta);
    totalSatisfactionDelta += delta;
    // Hand back to the normal "hanging out" beat rather than a hard-coded status — same pattern customerLifecycle.ts already uses after consuming a drink.
    customer.status = "deciding_next_order";
    customer.statusEnteredAtGameMinute = state.gameMinute;
  }

  attraction.completedSessions.push({
    gameDay: state.gameDay,
    participantIds: session.participantIds,
    startedAtGameMinute: session.startedAtGameMinute,
    endedAtGameMinute: state.gameMinute,
    feeCents: session.feeCents,
    satisfactionDelta: totalSatisfactionDelta,
  });
  attraction.gamesPlayedSinceClean += 1;
  decayAttractionOnUse(attraction);
  attraction.activeSession = null;

  if (!interrupted) {
    logActivity(state, bus, "attraction", `${attraction.name} became available.`, "info", attraction.id);
  }
}

/** Ticks down every attraction's active game by one minute and completes it at zero. */
export function advanceAttractionSessions(state: GameState, prop: OwnedPropertyState, bus: EventBus): void {
  for (const attraction of prop.attractions) {
    if (!attraction.activeSession) continue;
    attraction.activeSession.remainingGameMinutes -= 1;
    if (attraction.activeSession.remainingGameMinutes <= 0) {
      endSession(state, prop, bus, attraction, false);
    }
  }
}

/** Force-ends a session early (e.g. a participant is swept out at closing time) without applying normal completion satisfaction/wear effects. */
export function interruptAttractionSession(state: GameState, prop: OwnedPropertyState, bus: EventBus, attraction: Attraction): void {
  endSession(state, prop, bus, attraction, true);
}

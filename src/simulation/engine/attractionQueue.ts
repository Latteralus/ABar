import { createId } from "@/services/idService";
import { ATTRACTION_CONFIG } from "@/config/attractionConfig";
import { getAttractionCatalogEntryForCategory } from "@/data/attractions/attractionCatalog";
import { clampRound } from "@/utils/clamp";
import { attractionLabel, interruptAttractionSession, startAttractionSession } from "./attractionSessions";
import { isAttractionUsable } from "./attractionCondition";
import { logActivity } from "./activityLogger";
import type { EventBus } from "@/simulation/events/EventBus";
import type { Attraction, AttractionQueueEntry, Customer, EntityId, GameState } from "@/types";

export function attractionQueueParticipantCount(attraction: Attraction): number {
  return attraction.queue.reduce((sum, e) => sum + e.customerIds.length, 0);
}

/** Finds the attraction a customer is currently queued at or playing, if any — used to attribute an "order while playing" sale to the right attraction. */
export function findAttractionForCustomer(state: GameState, customerId: EntityId): Attraction | undefined {
  return state.attractions.find(
    (a) => a.queue.some((e) => e.customerIds.includes(customerId)) || a.activeSession?.participantIds.includes(customerId),
  );
}

/** Rough wait estimate for a new party deciding whether to join: whatever's left of the current game, plus one full game per party already ahead of them (only one table, so parties queue strictly one game after another). */
export function estimateAttractionWaitMinutes(attraction: Attraction, gameDurationMinutes: number): number {
  const remaining = attraction.activeSession?.remainingGameMinutes ?? 0;
  return remaining + attraction.queue.length * gameDurationMinutes;
}

/** Joins the queue if there's room; returns false (caller should treat as "didn't join") if the queue is already at capacity. */
export function joinAttractionQueue(state: GameState, bus: EventBus, attraction: Attraction, customerIds: EntityId[], groupId: EntityId | null): boolean {
  const catalogEntry = getAttractionCatalogEntryForCategory(attraction.category);
  if (attraction.queue.length >= catalogEntry.queueCapacityParties) return false;

  attraction.queue.push({ id: createId("attrqueue"), customerIds, groupId, joinedAtGameMinute: state.gameMinute });
  for (const id of customerIds) {
    const customer = state.customers.find((c) => c.id === id);
    if (customer) {
      customer.status = "waiting_for_attraction";
      customer.statusEnteredAtGameMinute = state.gameMinute;
    }
  }
  logActivity(state, bus, "attraction", `${attractionLabel(state, customerIds, groupId)} joined the ${attraction.name} queue.`, "info", attraction.id);
  return true;
}

/** Removes a customer's party from whichever attraction queue they're in after they've waited too long — they return to their normal visit, not leave the bar. */
export function abandonAttractionQueue(state: GameState, bus: EventBus, customer: Customer): void {
  for (const attraction of state.attractions) {
    const index = attraction.queue.findIndex((e) => e.customerIds.includes(customer.id));
    if (index === -1) continue;

    const entry = attraction.queue[index];
    attraction.queue.splice(index, 1);
    attraction.queueHistory.push({
      gameDay: state.gameDay,
      customerIds: entry.customerIds,
      groupId: entry.groupId,
      joinedAtGameMinute: entry.joinedAtGameMinute,
      leftAtGameMinute: state.gameMinute,
      resolution: "abandoned",
    });

    for (const id of entry.customerIds) {
      const member = state.customers.find((c) => c.id === id);
      if (!member) continue;
      member.satisfaction = clampRound(member.satisfaction - ATTRACTION_CONFIG.satisfactionLossOnAbandonQueue);
      member.status = "deciding_next_order";
      member.statusEnteredAtGameMinute = state.gameMinute;
    }

    logActivity(state, bus, "attraction", `A group left the ${attraction.name} queue after waiting too long.`, "warning", attraction.id);
    return;
  }
}

/**
 * Safety-net cleanup for a customer leaving the bar (normally or swept out at closing) while
 * still queued or mid-game — pulls them out of whichever attraction they're involved with so no
 * stale customer ID lingers in a queue entry or active session. Called from
 * customerLifecycle.departCustomer.
 */
export function removeCustomerFromAttractions(state: GameState, bus: EventBus, customerId: EntityId): void {
  for (const attraction of state.attractions) {
    const queueIndex = attraction.queue.findIndex((e) => e.customerIds.includes(customerId));
    if (queueIndex !== -1) {
      const entry = attraction.queue[queueIndex];
      attraction.queue.splice(queueIndex, 1);
      attraction.queueHistory.push({
        gameDay: state.gameDay,
        customerIds: entry.customerIds,
        groupId: entry.groupId,
        joinedAtGameMinute: entry.joinedAtGameMinute,
        leftAtGameMinute: state.gameMinute,
        resolution: "abandoned",
      });
      continue;
    }
    if (attraction.activeSession?.participantIds.includes(customerId)) {
      interruptAttractionSession(state, bus, attraction);
    }
  }
}

/**
 * Decides which queue entries form the next session, preferring a single entry that already
 * fits [min, max] on its own (earliest such entry, so a full arrival group never has to wait to
 * be combined with anyone) — falling back to combining consecutive small entries FIFO only when
 * no single entry qualifies alone. Without the first pass, a solo party stuck at the front of
 * the queue would permanently block a group of 4 arriving behind it, since greedily combining
 * front-to-back can "use up" room that only the later group actually needed.
 *
 * This is a deliberate simplification, not full bin-packing: it never considers combining a
 * front entry with a *later* qualifying entry (e.g. solo + a group of 2 right behind it, which
 * together would also fit) — the qualifying entry just goes alone and the solo customer keeps
 * waiting for another small party.
 */
export function selectNextSession(attraction: Attraction, minParticipants: number, maxParticipants: number): AttractionQueueEntry[] {
  const soloWinner = attraction.queue.find((e) => e.customerIds.length >= minParticipants && e.customerIds.length <= maxParticipants);
  if (soloWinner) return [soloWinner];

  const taken: AttractionQueueEntry[] = [];
  let count = 0;
  for (const entry of attraction.queue) {
    if (count + entry.customerIds.length > maxParticipants) continue;
    taken.push(entry);
    count += entry.customerIds.length;
    if (count >= minParticipants) break;
  }
  return count >= minParticipants ? taken : [];
}

/** Pulls entries off each idle, usable attraction's queue (via selectNextSession) and starts a session once enough participants are found. */
export function ensureAttractionQueueProgress(state: GameState, bus: EventBus): void {
  for (const attraction of state.attractions) {
    if (attraction.activeSession || !isAttractionUsable(attraction) || attraction.queue.length === 0) continue;
    const catalogEntry = getAttractionCatalogEntryForCategory(attraction.category);

    const taken = selectNextSession(attraction, catalogEntry.minParticipants, catalogEntry.maxParticipants);
    if (taken.length === 0) continue;

    const takenIds = new Set(taken.map((e) => e.id));
    attraction.queue = attraction.queue.filter((e) => !takenIds.has(e.id));
    for (const entry of taken) {
      attraction.queueHistory.push({
        gameDay: state.gameDay,
        customerIds: entry.customerIds,
        groupId: entry.groupId,
        joinedAtGameMinute: entry.joinedAtGameMinute,
        leftAtGameMinute: state.gameMinute,
        resolution: "started_session",
      });
    }

    const customerIds = taken.flatMap((e) => e.customerIds);
    const primaryGroupId = taken.length === 1 ? taken[0].groupId : null;
    startAttractionSession(state, bus, attraction, customerIds, primaryGroupId);
  }
}

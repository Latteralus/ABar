import { getAttractionCatalogEntryForCategory } from "@/data/attractions/attractionCatalog";
import { attractionQueueParticipantCount, estimateAttractionWaitMinutes } from "./attractionQueue";
import { isAttractionUsable } from "./attractionCondition";
import type { Attraction, GameState } from "@/types";

export interface AttractionStats {
  currentUsers: number;
  queueParties: number;
  queueParticipants: number;
  estimatedWaitMinutes: number;
  /** 0-100, or null when no game is in progress. */
  sessionProgressPercent: number | null;
  condition: number;
  isAvailable: boolean;
  revenueTodayCents: number;
  revenueWeekCents: number;
  gamesPlayedTotal: number;
  gamesPlayedToday: number;
  averageWaitMinutes: number;
  queueAbandonmentRatePercent: number;
  satisfactionContributionTotal: number;
  estimatedSecondarySalesCents: number;
}

function sumAttractionRevenue(state: GameState, attractionId: string, fromDay: number, toDay: number): number {
  return state.ledger
    .filter((e) => e.category === "revenue_attraction" && e.relatedEntityId === attractionId && e.gameDay >= fromDay && e.gameDay <= toDay)
    .reduce((sum, e) => sum + e.amount, 0);
}

/** Everything on the Attractions screen, derived on demand from the attraction's own history + the ledger — nothing here is precomputed/stored (same convention as ledgerSummary.ts). */
export function computeAttractionStats(state: GameState, attraction: Attraction): AttractionStats {
  const catalogEntry = getAttractionCatalogEntryForCategory(attraction.category);
  const weekStart = Math.max(1, state.gameDay - 6);

  const sessionProgressPercent = attraction.activeSession
    ? Math.round(
        ((catalogEntry.gameDurationMinutes - attraction.activeSession.remainingGameMinutes) / catalogEntry.gameDurationMinutes) * 100,
      )
    : null;

  const totalWaitMinutes = attraction.queueHistory.reduce((sum, r) => sum + Math.max(0, r.leftAtGameMinute - r.joinedAtGameMinute), 0);
  const abandonments = attraction.queueHistory.filter((r) => r.resolution === "abandoned").length;

  return {
    currentUsers: attraction.activeSession?.participantIds.length ?? 0,
    queueParties: attraction.queue.length,
    queueParticipants: attractionQueueParticipantCount(attraction),
    estimatedWaitMinutes: estimateAttractionWaitMinutes(attraction, catalogEntry.gameDurationMinutes),
    sessionProgressPercent,
    condition: attraction.condition,
    isAvailable: isAttractionUsable(attraction) && !attraction.activeSession,
    revenueTodayCents: sumAttractionRevenue(state, attraction.id, state.gameDay, state.gameDay),
    revenueWeekCents: sumAttractionRevenue(state, attraction.id, weekStart, state.gameDay),
    gamesPlayedTotal: attraction.completedSessions.length,
    gamesPlayedToday: attraction.completedSessions.filter((r) => r.gameDay === state.gameDay).length,
    averageWaitMinutes: attraction.queueHistory.length > 0 ? Math.round(totalWaitMinutes / attraction.queueHistory.length) : 0,
    queueAbandonmentRatePercent: attraction.queueHistory.length > 0 ? Math.round((abandonments / attraction.queueHistory.length) * 100) : 0,
    satisfactionContributionTotal: Math.round(attraction.completedSessions.reduce((sum, r) => sum + r.satisfactionDelta, 0)),
    estimatedSecondarySalesCents: attraction.estimatedSecondarySalesCents,
  };
}

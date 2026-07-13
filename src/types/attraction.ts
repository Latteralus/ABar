import type { Cents, EntityId, GameMinute, Percent0to100 } from "./common";

/** Only "pool_table" exists today; the architecture is generic so a second type is a data-catalog addition, not new engine code. */
export type AttractionCategory = "pool_table";

/** Mirrors EquipmentStatus's state machine (Master Plan Section 48 shape) — its own independent machine, not shared with Equipment. */
export type AttractionStatus = "operational" | "degraded" | "failed" | "awaiting_repair" | "under_repair";

export interface AttractionRepairRecord {
  gameDay: number;
  gameMinute: GameMinute;
  method: "employee" | "contract";
  costCents: Cents;
}

/** One completed or abandoned wait in the queue — raw history that utilization/wait/abandonment stats are derived from on demand. */
export interface AttractionQueueRecord {
  gameDay: number;
  customerIds: EntityId[];
  groupId: EntityId | null;
  joinedAtGameMinute: GameMinute;
  leftAtGameMinute: GameMinute;
  resolution: "started_session" | "abandoned";
}

/** One completed game — raw history that games-played/revenue/satisfaction stats are derived from on demand. */
export interface AttractionSessionRecord {
  gameDay: number;
  participantIds: EntityId[];
  startedAtGameMinute: GameMinute;
  endedAtGameMinute: GameMinute;
  feeCents: Cents;
  satisfactionDelta: number;
}

/** A party currently waiting for the attraction — one decision-unit (a whole arrival group, or a solo customer), never a split group. */
export interface AttractionQueueEntry {
  id: EntityId;
  customerIds: EntityId[];
  groupId: EntityId | null;
  joinedAtGameMinute: GameMinute;
}

/** An in-progress game. Stored directly on the Attraction (not a global array + ID lookup) — one table, at most one active game, per the "one active game per table" rule. */
export interface AttractionSession {
  id: EntityId;
  participantIds: EntityId[];
  startedAtGameMinute: GameMinute;
  remainingGameMinutes: number;
  feeCents: Cents;
}

export interface Attraction {
  id: EntityId;
  name: string;
  category: AttractionCategory;
  condition: Percent0to100;
  currentStatus: AttractionStatus;
  pricePerGameCents: Cents;
  queue: AttractionQueueEntry[];
  activeSession: AttractionSession | null;
  /** Resets to 0 whenever a clean_attraction task completes; ensureAttractionTasks queues one once this crosses ATTRACTION_CONFIG.gamesBetweenCleanings. */
  gamesPlayedSinceClean: number;
  queueHistory: AttractionQueueRecord[];
  completedSessions: AttractionSessionRecord[];
  repairHistory: AttractionRepairRecord[];
  /** Set while a contract repair is pending; cleared once resolved — mirrors Equipment.contractRepairDueGameDay. */
  contractRepairDueGameDay?: number;
  /** Running counter, incremented whenever a participant's "order while playing/queued" task is created — an estimate, not a reconciled total (see attractionRevenue.ts). */
  estimatedSecondarySalesCents: Cents;
}

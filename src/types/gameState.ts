import type { Cents, EntityId, GameMinute } from "./common";
import type { OwnedPropertyState } from "./property";
import type { Bill, BusinessPolicies, InsolvencyStatus, Loan, LedgerEntry } from "./financial";
import type { ActivityLogEntry } from "./activityLog";

export type DayState = "between_days" | "opening" | "open" | "closing" | "day_complete" | "bankrupt";

/** Monotonically increasing counters used to hand out human-readable numbers (tab #, receipt #, ...). */
export interface GameCounters {
  nextTabNumber: number;
  nextReceiptNumber: number;
  nextOrderNumber: number;
  nextPurchaseOrderNumber: number;
}

/**
 * The full serializable simulation state for a save. This is the single source of truth the
 * zustand store holds and the simulation engine mutates — React never derives gameplay facts
 * from anything other than this shape.
 *
 * Everything location-specific (equipment, attractions, inventory, staff, customers, tasks,
 * reputation, ...) lives inside `properties` (one `OwnedPropertyState` per owned/leased
 * location — see property.ts) rather than as flat top-level fields, since a player can own and
 * operate several properties at once, none of it transferable between them. Exactly one property
 * (`activePropertyId`) gets the full live minute-by-minute simulation at a time; every other
 * owned property runs on a background daily estimate (see simulation/engine/backgroundOperations.ts).
 *
 * Fields that stay here, at the top level, are genuinely company-wide: the player has one bank
 * account (`cash`), one consolidated set of books (`ledger`, though entries may be tagged with
 * `propertyId`), one shared clock, one startup loan, and one save file — not one per property.
 */
export interface GameState {
  saveId: EntityId;
  saveName: string;
  createdAtIso: string;
  lastPlayedAtIso: string;

  /** Day counter, starting at 1 on the first operating day. */
  gameDay: number;
  /** Minutes elapsed since the current operating day opened (0 at 2:00 p.m., 720 at 2:00 a.m. close). */
  gameMinute: GameMinute;
  dayState: DayState;
  isPaused: boolean;
  autoOpenEnabled: boolean;

  cash: Cents;
  loan: Loan | null;
  policies: BusinessPolicies;

  properties: OwnedPropertyState[];
  /** FK into `properties` — which one is currently live-simulated. Switching is a between-days-only player action (commandService.switchActiveProperty). */
  activePropertyId: EntityId;

  ledger: LedgerEntry[];
  /** Company-wide bills only (the startup loan) — every other bill kind lives on the owning OwnedPropertyState. */
  bills: Bill[];
  insolvency: InsolvencyStatus | null;
  activityLog: ActivityLogEntry[];

  counters: GameCounters;

  rngSeed: number;
  rngState: number;
}

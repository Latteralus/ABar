import type { Cents, EntityId, GameMinute } from "./common";
import type { OwnedProperty } from "./property";
import type { Bill, BusinessPolicies, InsolvencyStatus, Loan, LedgerEntry } from "./financial";
import type { ReputationState, Review } from "./reputation";
import type { ActivePromotion } from "./advertising";
import type { Employee } from "./employee";
import type { Customer, CustomerGroup } from "./customer";
import type { InventoryItem, PurchaseOrder } from "./inventory";
import type { MenuListing } from "./product";
import type { Tab, Receipt } from "./transaction";
import type { ServiceTask, Order } from "./task";
import type { ActivityLogEntry } from "./activityLog";
import type { DailyReport } from "./report";
import type { Equipment } from "./equipment";
import type { Attraction } from "./attraction";

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
  property: OwnedProperty | null;
  propertyId: EntityId;
  loan: Loan | null;
  policies: BusinessPolicies;

  employees: Employee[];
  customers: Customer[];
  customerGroups: CustomerGroup[];

  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  equipment: Equipment[];
  attractions: Attraction[];

  menu: MenuListing[];

  /** 0-100 facility cleanliness. Decays with service volume, restored by clean_bar/clean_table tasks. Feeds Stage 6 reputation once that exists. */
  barCleanliness: number;

  tabs: Tab[];
  receipts: Receipt[];
  tasks: ServiceTask[];
  orders: Order[];

  ledger: LedgerEntry[];
  bills: Bill[];
  insolvency: InsolvencyStatus | null;
  reputation: ReputationState;
  reviews: Review[];
  activePromotions: ActivePromotion[];
  activityLog: ActivityLogEntry[];
  dailyReports: DailyReport[];

  counters: GameCounters;

  rngSeed: number;
  rngState: number;
}

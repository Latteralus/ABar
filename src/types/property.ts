import type { Cents, EntityId, GameMinute } from "./common";
import type { Equipment } from "./equipment";
import type { Attraction } from "./attraction";
import type { Employee } from "./employee";
import type { Customer, CustomerGroup } from "./customer";
import type { InventoryItem, PurchaseOrder } from "./inventory";
import type { MenuListing } from "./product";
import type { Tab, Receipt } from "./transaction";
import type { ServiceTask, Order } from "./task";
import type { ReputationState, Review } from "./reputation";
import type { ActivePromotion } from "./advertising";
import type { DailyReport, BackgroundEstimateProfile } from "./report";
import type { Bill } from "./financial";

export interface NeighborhoodProfile {
  averageCustomerIncome: "low" | "middle" | "high";
  trafficLevel: number; // 0-100
  competitionLevel: number; // 0-100
}

export type AcquisitionType = "buy" | "lease";

export interface Property {
  id: EntityId;
  name: string;
  description: string;
  purchasePrice: Cents;
  leasePricePerWeek: Cents;
  customerCapacity: number;
  seatingCapacity: number;
  barSeatingSlots: number;
  tableSeatingSlots: number;
  /** Physical/utility room available for equipment footprints. Unlike storage capacity, this is a hard cap. */
  equipmentFloorSpaceUnits: number;
  storageCapacityUnits: number;
  /** Physical floor space available for attractions (pool tables, ...) — a hard cap on purchases, unlike storage capacity which only raises spoilage risk. */
  attractionFloorSpaceUnits: number;
  neighborhood: NeighborhoodProfile;
  existingEquipment: Equipment[];
}

/**
 * Everything that happens AT one owned/leased location. Nothing in here is transferable to
 * another property (equipment/attractions/inventory/staff all stay put) — a player operating
 * several properties has one of these per property. Exactly one property is "active" at a time
 * (GameState.activePropertyId) and gets the full live minute-by-minute simulation; every other
 * owned property is "background" (see backgroundEstimate and simulation/engine/backgroundOperations.ts) —
 * deterministic costs (rent/payroll/utilities) still accrue, but revenue/COGS are estimated from
 * this property's own trailing real history rather than simulated customer-by-customer.
 */
export interface OwnedPropertyState {
  propertyId: EntityId; // FK into the Property catalog — unique within GameState.properties
  acquisitionType: AcquisitionType;
  acquiredAtGameMinute: GameMinute;
  acquiredAtGameDay: number;
  /** Last gameDay this property ran the full live simulation (= acquiredAtGameDay until first activated). */
  lastActiveGameDay: number;

  employees: Employee[];
  customers: Customer[];
  customerGroups: CustomerGroup[];

  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  equipment: Equipment[];
  attractions: Attraction[];

  menu: MenuListing[];

  barCleanliness: number;

  tabs: Tab[];
  receipts: Receipt[];
  tasks: ServiceTask[];
  orders: Order[];

  reputation: ReputationState;
  reviews: Review[];
  activePromotions: ActivePromotion[];
  /** Real, historical daily reports only — never appended to for a background (non-active) day. */
  dailyReports: DailyReport[];
  /** Payroll/utilities/lease/licensing/supply_tab/sales_tax bills for THIS property. The startup loan bill is global (GameState.bills), not per-property. */
  bills: Bill[];

  /** Set the moment this property is switched away from; reused unchanged for every background day until it's made active again. Undefined until the first such switch. */
  backgroundEstimate?: BackgroundEstimateProfile;
}

/** @deprecated pre-multi-property shape, kept only for saveService's v10 migration to read old envelopes. */
export interface OwnedProperty {
  propertyId: EntityId;
  acquisitionType: AcquisitionType;
  acquiredAtGameMinute: number;
}

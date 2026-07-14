import type { Cents, EntityId } from "./common";
import type { CustomerLeaveReason } from "./customer";

export interface ProductSalesLine {
  productId: EntityId;
  productName: string;
  quantitySold: number;
  revenue: Cents;
}

export interface DailyReport {
  gameDay: number;
  customerCount: number;
  groupCount: number;
  revenue: Cents;
  salesByProduct: ProductSalesLine[];
  cogs: Cents;
  grossProfit: Cents;
  payrollAccrued: Cents;
  operatingExpenses: Cents;
  netProfit: Cents;
  averageSatisfaction: number;
  averageWaitMinutes: number;
  customersLost: number;
  lossReasons: Partial<Record<CustomerLeaveReason, number>>;
  inventoryConsumedUnits: number;
  inventoryWastedUnits: number;
  attractionSessionsCompletedToday: number;
}

/**
 * A snapshot computed once, the moment a property is switched away from (see
 * commandService.switchActiveProperty), and reused unchanged for every "background" day the
 * property is inactive — see simulation/engine/backgroundOperations.ts. Only revenue/COGS/customer
 * count/inventory consumption are estimated; rent/payroll/utilities are already deterministic and
 * simply keep accruing for every owned property regardless of active/background status.
 */
export interface BackgroundEstimateProfile {
  averageDailyRevenue: Cents;
  averageDailyCogs: Cents;
  averageDailyCustomerCount: number;
  averageDailyInventoryConsumedUnits: number;
  /** How many real days the average is drawn from; 0 = this property has never been active yet. */
  sampleDayCount: number;
  computedAtGameDay: number;
}

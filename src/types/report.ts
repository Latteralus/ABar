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

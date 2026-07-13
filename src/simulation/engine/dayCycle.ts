import { getProperty } from "@/data/properties";
import { formatCents } from "@/utils/money";
import type { EventBus } from "@/simulation/events/EventBus";
import type { CustomerLeaveReason, DailyReport, GameState, ProductSalesLine } from "@/types";
import { logActivity } from "./activityLogger";
import { summarizeDay } from "./ledgerSummary";
import { applyShiftProgression } from "./skillProgression";
import { applySpoilage } from "./spoilage";
import { applyDailyEquipmentWear, resolveDueContractRepairs } from "./equipmentMaintenance";
import { applyDailyAttractionWear } from "./attractionCondition";
import { resolveDueAttractionContractRepairs } from "./attractionTasks";
import { accrueDailyPayroll, generateSundayBills, markOverdueBills, updateInsolvency } from "./finance";
import { updateReputation } from "./reputation";
import { expireEndedPromotions } from "./advertising";
import { ensureMenuAutoActivation } from "./menuAutomation";

/** Delivers any purchase orders placed during the prior between-day phase (Master Plan Section 17). */
function deliverDuePurchaseOrders(state: GameState, bus: EventBus): void {
  let deliveredAny = false;
  for (const po of state.purchaseOrders) {
    if (po.deliveryStatus !== "pending") continue;
    po.deliveryStatus = "delivered";
    deliveredAny = true;
    for (const line of po.lines) {
      const item = state.inventory.find((i) => i.id === line.inventoryItemId);
      if (!item) continue;
      const existingValue = item.averageUnitCost * item.quantityOnHand;
      const incomingValue = line.unitCost * line.quantity;
      const newQuantity = item.quantityOnHand + line.quantity;
      item.averageUnitCost = newQuantity > 0 ? Math.round((existingValue + incomingValue) / newQuantity) : item.averageUnitCost;
      item.quantityOnHand = newQuantity;
      item.pendingDeliveryQuantity = Math.max(0, item.pendingDeliveryQuantity - line.quantity);
      item.daysSinceLastRestock = 0;
    }
    logActivity(state, bus, "inventory", `Purchase order #${po.orderNumber} was delivered.`);
  }
  if (deliveredAny) ensureMenuAutoActivation(state, bus);
}

export function openDay(state: GameState, bus: EventBus): void {
  if (state.dayState === "bankrupt") return;
  state.customers = [];
  state.customerGroups = [];
  state.orders = [];
  state.tasks = [];
  for (const item of state.inventory) item.recentUsage = 0;
  // Queued/playing customer IDs are about to be wiped along with state.customers — nothing left
  // to notify, so this is a blunt reset, same as tasks/orders above, not a graceful abandon.
  for (const attraction of state.attractions) {
    attraction.queue = [];
    attraction.activeSession = null;
  }

  state.dayState = "open";
  state.gameMinute = 0;

  deliverDuePurchaseOrders(state, bus);
  resolveDueContractRepairs(state, bus);
  resolveDueAttractionContractRepairs(state, bus);
  markOverdueBills(state);
  updateInsolvency(state, bus);
  logActivity(state, bus, "system", `The bar opened for Day ${state.gameDay}.`);
  bus.emit("day:opened", { gameDay: state.gameDay });
}

function buildDailyReport(state: GameState, wastedUnits: number): DailyReport {
  const day = state.gameDay;
  const { revenue, cogs, operatingExpenses } = summarizeDay(state.ledger, day);
  const payrollAccrued = state.ledger
    .filter((e) => e.gameDay === day && e.category === "opex_payroll" && e.type === "debit")
    .reduce((s, e) => s + e.amount, 0);

  const salesByProductMap = new Map<string, ProductSalesLine>();
  for (const receipt of state.receipts.filter((r) => r.gameDay === day)) {
    for (const line of receipt.lineItems) {
      const existing = salesByProductMap.get(line.productId);
      const revenueForLine = line.unitPrice * line.quantity;
      if (existing) {
        existing.quantitySold += line.quantity;
        existing.revenue += revenueForLine;
      } else {
        salesByProductMap.set(line.productId, {
          productId: line.productId,
          productName: line.productName,
          quantitySold: line.quantity,
          revenue: revenueForLine,
        });
      }
    }
  }

  const leftCustomers = state.customers.filter((c) => c.status === "left" || c.status === "removed");
  const lostCustomers = leftCustomers.filter((c) => c.leaveReason && c.leaveReason !== "satisfied_departure");
  const lossReasons: Partial<Record<CustomerLeaveReason, number>> = {};
  for (const c of lostCustomers) {
    if (!c.leaveReason) continue;
    lossReasons[c.leaveReason] = (lossReasons[c.leaveReason] ?? 0) + 1;
  }

  const satisfactionValues = leftCustomers.map((c) => c.satisfaction);
  const averageSatisfaction = satisfactionValues.length
    ? Math.round(satisfactionValues.reduce((s, v) => s + v, 0) / satisfactionValues.length)
    : 0;

  const servedOrders = state.orders.filter((o) => o.waitMinutesAtDelivery !== undefined);
  const averageWaitMinutes = servedOrders.length
    ? Math.round(servedOrders.reduce((s, o) => s + (o.waitMinutesAtDelivery ?? 0), 0) / servedOrders.length)
    : 0;

  const inventoryConsumedUnits = state.inventory.reduce((s, i) => s + i.recentUsage, 0);

  return {
    gameDay: day,
    customerCount: state.customers.length,
    groupCount: state.customerGroups.length,
    revenue,
    salesByProduct: Array.from(salesByProductMap.values()),
    cogs,
    grossProfit: revenue - cogs,
    payrollAccrued,
    operatingExpenses,
    netProfit: revenue - cogs - operatingExpenses,
    averageSatisfaction,
    averageWaitMinutes,
    customersLost: lostCustomers.length,
    lossReasons,
    inventoryConsumedUnits: Math.round(inventoryConsumedUnits),
    inventoryWastedUnits: wastedUnits,
    attractionSessionsCompletedToday: state.attractions.reduce(
      (sum, a) => sum + a.completedSessions.filter((r) => r.gameDay === day).length,
      0,
    ),
  };
}

export function closeDay(state: GameState, bus: EventBus): void {
  if (state.dayState === "bankrupt") return;
  accrueDailyPayroll(state, bus);
  const wastedUnits = applySpoilage(state, bus, getProperty(state.propertyId));
  applyDailyEquipmentWear(state, bus);
  applyDailyAttractionWear(state, bus);
  const report = buildDailyReport(state, wastedUnits);
  state.dailyReports.push(report);
  updateReputation(state, bus, report);

  // All hired staff work every operating day (Section 23) — everyone gets a shift of experience.
  for (const employee of state.employees) applyShiftProgression(employee);

  logActivity(state, bus, "system", `The bar closed for Day ${state.gameDay}. Net profit: ${formatCents(report.netProfit)}.`);
  bus.emit("day:closed", { gameDay: state.gameDay });
  state.gameDay += 1;
  state.dayState = "between_days";
  markOverdueBills(state);
  generateSundayBills(state, bus);
  updateInsolvency(state, bus);
  expireEndedPromotions(state, bus);
}

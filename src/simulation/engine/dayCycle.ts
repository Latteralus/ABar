import { getProperty } from "@/data/properties";
import { formatCents } from "@/utils/money";
import type { EventBus } from "@/simulation/events/EventBus";
import type { CustomerLeaveReason, DailyReport, GameState, OwnedPropertyState, ProductSalesLine } from "@/types";
import { activeProperty, backgroundProperties } from "./activeProperty";
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
import { runBackgroundPropertyDay } from "./backgroundOperations";

/** Delivers any purchase orders placed during the prior between-day phase (Master Plan Section 17). */
function deliverDuePurchaseOrders(state: GameState, prop: OwnedPropertyState, bus: EventBus): void {
  let deliveredAny = false;
  for (const po of prop.purchaseOrders) {
    if (po.deliveryStatus !== "pending") continue;
    po.deliveryStatus = "delivered";
    deliveredAny = true;
    for (const line of po.lines) {
      const item = prop.inventory.find((i) => i.id === line.inventoryItemId);
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
  if (deliveredAny) ensureMenuAutoActivation(state, prop, bus);
}

export function openDay(state: GameState, bus: EventBus): void {
  if (state.dayState === "bankrupt") return;
  const active = activeProperty(state);
  active.customers = [];
  active.customerGroups = [];
  active.orders = [];
  active.tasks = [];
  for (const item of active.inventory) item.recentUsage = 0;
  // Queued/playing customer IDs are about to be wiped along with active.customers — nothing left
  // to notify, so this is a blunt reset, same as tasks/orders above, not a graceful abandon.
  for (const attraction of active.attractions) {
    attraction.queue = [];
    attraction.activeSession = null;
  }

  state.dayState = "open";
  state.gameMinute = 0;

  // Deterministic, already-scheduled background processes (a purchase order in transit, a
  // contract repair booked days ago) resolve on schedule for every owned property, not just the
  // active one — a background property still receives its deliveries and repairs.
  for (const prop of state.properties) {
    deliverDuePurchaseOrders(state, prop, bus);
    resolveDueContractRepairs(state, prop, bus);
    resolveDueAttractionContractRepairs(state, prop, bus);
    markOverdueBills(prop.bills, state.gameDay);
  }
  markOverdueBills(state.bills, state.gameDay);
  updateInsolvency(state, bus);
  logActivity(state, bus, "system", `The bar opened for Day ${state.gameDay}.`);
  bus.emit("day:opened", { gameDay: state.gameDay });
}

function buildDailyReport(state: GameState, prop: OwnedPropertyState, wastedUnits: number): DailyReport {
  const day = state.gameDay;
  // Scoped to this property's own ledger entries (plus any untagged company-wide ones, e.g. the
  // loan) — otherwise another property's background-estimate revenue/COGS would leak into the
  // active property's real daily report once more than one property is owned.
  const propertyLedger = state.ledger.filter((e) => e.propertyId === undefined || e.propertyId === prop.propertyId);
  const { revenue, cogs, operatingExpenses } = summarizeDay(propertyLedger, day);
  const payrollAccrued = propertyLedger
    .filter((e) => e.gameDay === day && e.category === "opex_payroll" && e.type === "debit")
    .reduce((s, e) => s + e.amount, 0);

  const salesByProductMap = new Map<string, ProductSalesLine>();
  for (const receipt of prop.receipts.filter((r) => r.gameDay === day)) {
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

  const leftCustomers = prop.customers.filter((c) => c.status === "left" || c.status === "removed");
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

  const servedOrders = prop.orders.filter((o) => o.waitMinutesAtDelivery !== undefined);
  const averageWaitMinutes = servedOrders.length
    ? Math.round(servedOrders.reduce((s, o) => s + (o.waitMinutesAtDelivery ?? 0), 0) / servedOrders.length)
    : 0;

  const inventoryConsumedUnits = prop.inventory.reduce((s, i) => s + i.recentUsage, 0);

  return {
    gameDay: day,
    customerCount: prop.customers.length,
    groupCount: prop.customerGroups.length,
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
    attractionSessionsCompletedToday: prop.attractions.reduce(
      (sum, a) => sum + a.completedSessions.filter((r) => r.gameDay === day).length,
      0,
    ),
  };
}

export function closeDay(state: GameState, bus: EventBus): void {
  if (state.dayState === "bankrupt") return;
  const active = activeProperty(state);

  // Deterministic per-property costs run for every owned property, active or background.
  for (const prop of state.properties) {
    accrueDailyPayroll(state, prop, bus);
  }

  const wastedUnits = applySpoilage(state, active, bus, getProperty(active.propertyId));
  applyDailyEquipmentWear(state, active, bus);
  applyDailyAttractionWear(state, active, bus);
  const report = buildDailyReport(state, active, wastedUnits);
  active.dailyReports.push(report);
  active.lastActiveGameDay = state.gameDay;
  updateReputation(state, active, bus, report);

  // All hired staff work every operating day (Section 23) — everyone gets a shift of experience.
  for (const employee of active.employees) applyShiftProgression(employee);

  // Background properties still physically decay (equipment/attractions wear, inventory spoils)
  // regardless of live simulation, and post an estimated revenue/COGS day from their own trailing
  // history — but never get a dailyReports entry, since that's the real history the estimate is
  // computed from (see backgroundOperations.ts).
  for (const prop of backgroundProperties(state)) {
    applySpoilage(state, prop, bus, getProperty(prop.propertyId));
    applyDailyEquipmentWear(state, prop, bus);
    applyDailyAttractionWear(state, prop, bus);
    runBackgroundPropertyDay(state, prop, bus);
  }

  logActivity(state, bus, "system", `The bar closed for Day ${state.gameDay}. Net profit: ${formatCents(report.netProfit)}.`);
  bus.emit("day:closed", { gameDay: state.gameDay });
  state.gameDay += 1;
  state.dayState = "between_days";
  for (const prop of state.properties) {
    markOverdueBills(prop.bills, state.gameDay);
    generateSundayBills(state, prop, bus);
    expireEndedPromotions(state, prop, bus);
  }
  markOverdueBills(state.bills, state.gameDay);
  updateInsolvency(state, bus);
}

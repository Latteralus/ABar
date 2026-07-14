import { FINANCE_CONFIG } from "@/config/financeConfig";
import { getProperty } from "@/data/properties";
import { createId } from "@/services/idService";
import { formatCents } from "@/utils/money";
import type { EventBus } from "@/simulation/events/EventBus";
import type { Bill, BillKind, GameState, LedgerCategory, OwnedPropertyState } from "@/types";
import { logActivity } from "./activityLogger";
import { postLedger, spendCash } from "./ledger";

export function nextBillingDay(fromGameDay: number): number {
  return Math.ceil(fromGameDay / FINANCE_CONFIG.billingCycleDays) * FINANCE_CONFIG.billingCycleDays;
}

function addBill(state: GameState, prop: OwnedPropertyState, bill: Omit<Bill, "id" | "createdGameDay" | "status">): Bill {
  const existing = prop.bills.find(
    (b) => b.status !== "paid" && b.kind === bill.kind && b.relatedEntityId === bill.relatedEntityId && b.description === bill.description,
  );
  if (existing) return existing;
  const created: Bill = { id: createId("bill"), createdGameDay: state.gameDay, status: "outstanding", ...bill };
  prop.bills.push(created);
  return created;
}

/** Every bill kind but the startup loan lives on the owning property — pass `state.bills` for the
 * loan (company-wide) or a property's `bills` (payroll/utilities/lease/licensing/supply_tab/sales_tax),
 * or a combined array when a screen needs to show both at once. */
export function outstandingBills(bills: Bill[]): Bill[] {
  return bills.filter((b) => b.status === "outstanding" || b.status === "overdue");
}

export function outstandingBillTotal(bills: Bill[]): number {
  return outstandingBills(bills).reduce((sum, b) => sum + b.amount, 0);
}

export function accrueDailyPayroll(state: GameState, prop: OwnedPropertyState, bus?: EventBus): number {
  const amount = prop.employees.reduce((sum, e) => sum + e.wagePerShiftCents, 0);
  if (amount <= 0) return 0;
  const alreadyAccrued = state.ledger.some(
    (e) =>
      e.gameDay === state.gameDay &&
      e.category === "opex_payroll" &&
      e.propertyId === prop.propertyId &&
      e.description === `Payroll accrued — Day ${state.gameDay}`,
  );
  if (alreadyAccrued) return 0;

  postLedger(state, {
    category: "opex_payroll",
    type: "debit",
    amount,
    description: `Payroll accrued — Day ${state.gameDay}`,
    propertyId: prop.propertyId,
  });
  postLedger(state, {
    category: "liability_accrued_payroll",
    type: "credit",
    amount,
    description: `Payroll payable accrued — Day ${state.gameDay}`,
    propertyId: prop.propertyId,
  });
  addBill(state, prop, { kind: "payroll", description: `Payroll — Day ${state.gameDay}`, amount, dueGameDay: nextBillingDay(state.gameDay) });
  if (bus) logActivity(state, bus, "finance", `Accrued payroll for Day ${state.gameDay}: ${formatCents(amount)}.`);
  return amount;
}

function outstandingLedgerBalance(state: GameState, prop: OwnedPropertyState, category: LedgerCategory): number {
  return state.ledger
    .filter((e) => e.category === category && e.propertyId === prop.propertyId)
    .reduce((sum, e) => sum + (e.type === "credit" ? e.amount : -e.amount), 0);
}

function addWeeklyExpenseBill(
  state: GameState,
  prop: OwnedPropertyState,
  kind: BillKind,
  liabilityCategory: LedgerCategory,
  expenseCategory: LedgerCategory,
  amount: number,
  description: string,
): void {
  if (amount <= 0) return;
  const relatedEntityId = `${kind}-${state.gameDay}`;
  if (prop.bills.some((b) => b.relatedEntityId === relatedEntityId)) return;
  postLedger(state, { category: expenseCategory, type: "debit", amount, description, propertyId: prop.propertyId });
  postLedger(state, { category: liabilityCategory, type: "credit", amount, description: `${description} payable`, propertyId: prop.propertyId });
  addBill(state, prop, { kind, description, amount, dueGameDay: state.gameDay, relatedEntityId });
}

function runSundayBilling(state: GameState, prop: OwnedPropertyState, bus: EventBus): void {
  addWeeklyExpenseBill(
    state,
    prop,
    "utilities",
    "liability_utility_bills",
    "opex_utilities",
    FINANCE_CONFIG.weeklyUtilitiesCents,
    `Utilities — Week ending Day ${state.gameDay}`,
  );
  addWeeklyExpenseBill(
    state,
    prop,
    "licensing",
    "liability_utility_bills",
    "opex_licensing",
    FINANCE_CONFIG.weeklyLicensingCents,
    `Licensing — Week ending Day ${state.gameDay}`,
  );

  const property = getProperty(prop.propertyId);
  if (prop.acquisitionType === "lease") {
    addWeeklyExpenseBill(
      state,
      prop,
      "lease",
      "liability_lease_obligations",
      "opex_lease",
      property.leasePricePerWeek,
      `Lease — Week ending Day ${state.gameDay}`,
    );
  }

  const salesTaxDue = outstandingLedgerBalance(state, prop, "liability_sales_tax_payable");
  if (salesTaxDue > 0 && !outstandingBills(prop.bills).some((b) => b.kind === "sales_tax")) {
    addBill(state, prop, {
      kind: "sales_tax",
      description: `Sales tax remittance — Day ${state.gameDay}`,
      amount: salesTaxDue,
      dueGameDay: state.gameDay,
    });
  }

  // Loan handling stays global — one startup loan per save, not per owned property.
  if (state.loan && state.loan.remainingBalance > 0 && state.gameDay >= state.loan.nextDueGameDay) {
    const weeklyInterest = Math.round(
      state.loan.remainingBalance * (state.loan.annualInterestRatePercent / 100 / 365) * state.loan.paymentFrequencyDays,
    );
    state.loan.interestAccrued += weeklyInterest;
    if (weeklyInterest > 0)
      postLedger(state, {
        category: "opex_loan_interest",
        type: "debit",
        amount: weeklyInterest,
        description: `Loan interest accrued — Day ${state.gameDay}`,
      });
    const amount = Math.min(
      state.loan.remainingBalance + state.loan.interestAccrued,
      state.loan.minimumPayment + state.loan.interestAccrued,
    );
    const existingLoanBill = state.bills.find((b) => b.status !== "paid" && b.kind === "loan" && b.relatedEntityId === state.loan!.id);
    if (!existingLoanBill) {
      state.bills.push({
        id: createId("bill"),
        createdGameDay: state.gameDay,
        status: "outstanding",
        kind: "loan",
        description: `Startup loan payment — Day ${state.gameDay}`,
        amount,
        dueGameDay: state.gameDay,
        relatedEntityId: state.loan.id,
      });
    }
    state.loan.nextDueGameDay += state.loan.paymentFrequencyDays;
  }

  const due = outstandingBills(prop.bills)
    .filter((b) => b.dueGameDay <= state.gameDay)
    .reduce((sum, b) => sum + b.amount, 0);
  if (due > 0) logActivity(state, bus, "finance", `Sunday bills are due at ${property.name}: ${formatCents(due)}.`, "warning");
}

export function generateSundayBills(state: GameState, prop: OwnedPropertyState, bus: EventBus): void {
  if (state.gameDay % FINANCE_CONFIG.billingCycleDays !== 0) return;
  runSundayBilling(state, prop, bus);
}

/** Dev-only escape hatch (Master Plan Section 51) — runs the same weekly billing pass regardless of what day it is, so Stage 5's 7-day cadence doesn't need a long playtest to verify. */
export function forceSundayBillingNow(state: GameState, prop: OwnedPropertyState, bus: EventBus): void {
  runSundayBilling(state, prop, bus);
}

function liabilityCategoryForBill(kind: BillKind): LedgerCategory | null {
  switch (kind) {
    case "payroll":
      return "liability_accrued_payroll";
    case "utilities":
    case "licensing":
      return "liability_utility_bills";
    case "lease":
      return "liability_lease_obligations";
    case "supply_tab":
      return "liability_supply_tab";
    case "sales_tax":
      return "liability_sales_tax_payable";
    case "loan":
      return "liability_loan";
    default:
      return null;
  }
}

export function payBill(state: GameState, bus: EventBus, billId: string): { success: boolean; error?: string } {
  let bill = state.bills.find((b) => b.id === billId);
  let owningPropertyId: string | undefined;
  if (!bill) {
    for (const prop of state.properties) {
      bill = prop.bills.find((b) => b.id === billId);
      if (bill) {
        owningPropertyId = prop.propertyId;
        break;
      }
    }
  }
  if (!bill) return { success: false, error: "Bill not found." };
  if (bill.status === "paid") return { success: false, error: "Bill is already paid." };
  bill.status = "paid";
  bill.paidGameDay = state.gameDay;

  if (bill.kind === "loan" && state.loan) {
    // A loan bill's cash-affecting entries are tagged with the loan's id (not the bill's) so the
    // cash-flow statement can reliably classify every loan-related cash movement as financing,
    // regardless of whether it came through this weekly-bill path or the manual makeLoanPayment
    // command (which already tags entries the same way). The liability entry's amount (principal
    // only) differs from the cash entry's amount (principal + interest), so this can't go through
    // the single-amount spendCash helper — posted manually via the same shared postLedger.
    const interestPaid = Math.min(state.loan.interestAccrued, bill.amount);
    const principalPaid = Math.min(state.loan.remainingBalance, bill.amount - interestPaid);
    state.loan.interestAccrued -= interestPaid;
    state.loan.remainingBalance -= principalPaid;
    state.loan.paymentHistory.push({ gameMinute: state.gameMinute, amount: bill.amount });
    state.cash -= bill.amount;
    if (principalPaid > 0)
      postLedger(state, {
        category: "liability_loan",
        type: "debit",
        amount: principalPaid,
        description: bill.description,
        relatedEntityId: state.loan.id,
      });
    postLedger(state, {
      category: "asset_cash",
      type: "debit",
      amount: bill.amount,
      description: `${bill.description} paid`,
      relatedEntityId: state.loan.id,
    });
  } else {
    const liabilityCategory = liabilityCategoryForBill(bill.kind) ?? undefined;
    spendCash(state, bill.amount, {
      category: liabilityCategory,
      description: `${bill.description} paid`,
      relatedEntityId: bill.id,
      propertyId: owningPropertyId,
    });
  }

  logActivity(state, bus, "finance", `Paid bill: ${bill.description} (${formatCents(bill.amount)}).`);
  updateInsolvency(state, bus);
  return { success: true };
}

export function markOverdueBills(bills: Bill[], gameDay: number): void {
  for (const bill of bills) {
    if (bill.status === "outstanding" && bill.dueGameDay < gameDay) bill.status = "overdue";
  }
}

export function updateInsolvency(state: GameState, bus?: EventBus): void {
  if (state.dayState === "bankrupt") return;
  if (state.cash >= 0) {
    if (state.insolvency && bus) logActivity(state, bus, "finance", "Cash recovered above zero. Insolvency countdown cancelled.");
    state.insolvency = null;
    return;
  }
  if (!state.insolvency) {
    state.insolvency = { startedGameDay: state.gameDay, bankruptcyGameDay: state.gameDay + FINANCE_CONFIG.insolvencyGraceDays };
    if (bus)
      logActivity(
        state,
        bus,
        "finance",
        `Cash is negative. Bankruptcy in ${FINANCE_CONFIG.insolvencyGraceDays} days unless cash recovers.`,
        "warning",
      );
  }
  if (state.gameDay >= state.insolvency.bankruptcyGameDay) {
    state.dayState = "bankrupt";
    if (bus) logActivity(state, bus, "finance", "The business is bankrupt after seven days of negative cash.", "critical");
  }
}

export function createSupplyTabBill(
  state: GameState,
  prop: OwnedPropertyState,
  purchaseOrderId: string,
  orderNumber: number,
  amount: number,
): void {
  addBill(state, prop, {
    kind: "supply_tab",
    description: `Supply tab — PO #${orderNumber}`,
    amount,
    dueGameDay: nextBillingDay(state.gameDay),
    relatedEntityId: purchaseOrderId,
  });
}

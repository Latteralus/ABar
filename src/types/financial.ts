import type { Cents, EntityId, GameMinute } from "./common";

/**
 * Full chart of accounts from the master plan (Section 35). Stage 1 only ever posts entries
 * from a handful of these categories, but the type stays complete so later stages don't need
 * a ledger schema migration — just new callers.
 */
export type LedgerCategory =
  // revenue
  | "revenue_drink_sales"
  | "revenue_food_sales"
  | "revenue_bar_tip_share"
  | "revenue_attraction"
  | "revenue_other"
  /** Estimated revenue for a background (inactive) property — see simulation/engine/backgroundOperations.ts. Never posted for the active property, which uses the specific categories above instead. */
  | "revenue_background_estimate"
  // cost of goods sold
  | "cogs_alcohol"
  | "cogs_soft_drink"
  | "cogs_food_ingredients"
  | "cogs_spoilage"
  | "cogs_prep_waste"
  /** Estimated COGS for a background (inactive) property — see simulation/engine/backgroundOperations.ts. */
  | "cogs_background_estimate"
  // operating expenses
  | "opex_payroll"
  | "opex_utilities"
  | "opex_lease"
  | "opex_licensing"
  | "opex_advertising"
  | "opex_maintenance"
  | "opex_cleaning"
  | "opex_card_processing_fee"
  | "opex_contract_repair"
  | "opex_supply_purchase"
  | "opex_loan_interest"
  | "opex_recruiting"
  // balance sheet movements
  | "asset_cash"
  | "liability_loan"
  | "liability_supply_tab"
  | "liability_accrued_payroll"
  | "liability_utility_bills"
  | "liability_lease_obligations"
  | "liability_sales_tax_payable"
  | "equity_owner_capital";

export type LedgerEntryType = "debit" | "credit";

export interface LedgerEntry {
  id: EntityId;
  gameMinute: GameMinute;
  gameDay: number;
  category: LedgerCategory;
  type: LedgerEntryType;
  amount: Cents;
  description: string;
  relatedEntityId?: EntityId;
  /** Which owned property this entry belongs to, for slicing consolidated financials per-location. Optional so every pre-multi-property caller stays valid; omitted for company-wide entries (e.g. the startup loan). */
  propertyId?: EntityId;
}

export interface Loan {
  id: EntityId;
  principal: Cents;
  annualInterestRatePercent: number;
  paymentFrequencyDays: number;
  minimumPayment: Cents;
  remainingBalance: Cents;
  interestAccrued: Cents;
  nextDueGameDay: number;
  paymentHistory: { gameMinute: GameMinute; amount: Cents }[];
}

export type BillKind = "payroll" | "utilities" | "lease" | "supply_tab" | "loan" | "sales_tax" | "licensing" | "other";
export type BillStatus = "outstanding" | "paid" | "overdue";

export interface Bill {
  id: EntityId;
  kind: BillKind;
  description: string;
  amount: Cents;
  dueGameDay: number;
  createdGameDay: number;
  status: BillStatus;
  paidGameDay?: number;
  relatedEntityId?: EntityId;
}

export interface InsolvencyStatus {
  startedGameDay: number;
  bankruptcyGameDay: number;
}

export interface BusinessPolicies {
  /** 0-1 share of tips retained by the bar; the rest is distributed to staff. */
  barTipSharePercent: number;
}

/** Rolled-up numbers for a single operating day, derived from the ledger — not stored authoritatively. */
export interface DailyFinancialSummary {
  gameDay: number;
  revenue: Cents;
  cogs: Cents;
  grossProfit: Cents;
  operatingExpenses: Cents;
  netProfit: Cents;
}

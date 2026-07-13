import { getProperty } from "@/data/properties";
import { getAttractionCatalogEntryForCategory } from "@/data/attractions/attractionCatalog";
import type { Cents, GameState, LedgerCategory } from "@/types";

export interface BalanceSheetSummary {
  gameDay: number;
  cash: Cents;
  inventoryValue: Cents;
  equipmentValue: Cents;
  attractionValue: Cents;
  propertyValue: Cents;
  totalAssets: Cents;
  loanPayable: Cents;
  supplyTabsPayable: Cents;
  accruedPayroll: Cents;
  utilityBillsPayable: Cents;
  leaseObligationsPayable: Cents;
  salesTaxPayable: Cents;
  totalLiabilities: Cents;
  ownerCapital: Cents;
  retainedEarnings: Cents;
  totalEquity: Cents;
}

/** Net running balance for a ledger category — credits increase it, debits decrease it (matches how every liability/equity category is posted throughout the codebase). */
function netLedgerBalance(state: GameState, category: LedgerCategory): Cents {
  return state.ledger.filter((e) => e.category === category).reduce((sum, e) => sum + (e.type === "credit" ? e.amount : -e.amount), 0);
}

/**
 * Assets/liabilities/equity as of right now, derived from live state and the ledger — nothing
 * here is stored. Loan liability reads `state.loan` directly rather than the ledger: accrued
 * interest is tracked on the Loan object and was never mirrored into a `liability_loan` credit
 * (`finance.ts`'s `runSundayBilling` only posts the `opex_loan_interest` debit side), so the
 * ledger alone would understate it. Retained earnings is a plug (`totalEquity - ownerCapital`) —
 * this simulation isn't strict double-entry, so it honestly represents "whatever equity is left
 * over," not a separately-tracked cumulative net income figure.
 */
export function summarizeBalanceSheet(state: GameState): BalanceSheetSummary {
  const cash = state.cash;
  const inventoryValue = state.inventory.reduce((sum, i) => sum + i.quantityOnHand * i.averageUnitCost, 0);
  const equipmentValue = state.equipment.reduce((sum, e) => sum + e.purchasePrice, 0);
  const attractionValue = state.attractions.reduce((sum, a) => sum + getAttractionCatalogEntryForCategory(a.category).purchasePrice, 0);
  const property = getProperty(state.propertyId);
  const propertyValue = state.property?.acquisitionType === "buy" ? property.purchasePrice : 0;
  const totalAssets = cash + inventoryValue + equipmentValue + attractionValue + propertyValue;

  const loanPayable = state.loan ? state.loan.remainingBalance + state.loan.interestAccrued : 0;
  const supplyTabsPayable = netLedgerBalance(state, "liability_supply_tab");
  const accruedPayroll = netLedgerBalance(state, "liability_accrued_payroll");
  const utilityBillsPayable = netLedgerBalance(state, "liability_utility_bills");
  const leaseObligationsPayable = netLedgerBalance(state, "liability_lease_obligations");
  const salesTaxPayable = netLedgerBalance(state, "liability_sales_tax_payable");
  const totalLiabilities =
    loanPayable + supplyTabsPayable + accruedPayroll + utilityBillsPayable + leaseObligationsPayable + salesTaxPayable;

  const ownerCapital = netLedgerBalance(state, "equity_owner_capital");
  const totalEquity = totalAssets - totalLiabilities;
  const retainedEarnings = totalEquity - ownerCapital;

  return {
    gameDay: state.gameDay,
    cash,
    inventoryValue,
    equipmentValue,
    attractionValue,
    propertyValue,
    totalAssets,
    loanPayable,
    supplyTabsPayable,
    accruedPayroll,
    utilityBillsPayable,
    leaseObligationsPayable,
    salesTaxPayable,
    totalLiabilities,
    ownerCapital,
    retainedEarnings,
    totalEquity,
  };
}

import type { DailyFinancialSummary, LedgerEntry } from "@/types";

/** Shared roll-up used by both the daily report generator and any live "today so far" UI reads — the ledger is the single source of truth (Master Plan Section 35). */
export function summarizeDay(ledger: LedgerEntry[], gameDay: number): DailyFinancialSummary {
  const dayLedger = ledger.filter((e) => e.gameDay === gameDay);
  const sum = (prefix: string, type: "credit" | "debit") =>
    dayLedger.filter((e) => e.category.startsWith(prefix) && e.type === type).reduce((s, e) => s + e.amount, 0);

  const revenue = sum("revenue_", "credit");
  const cogs = sum("cogs_", "debit");
  const operatingExpenses = sum("opex_", "debit");

  return {
    gameDay,
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    operatingExpenses,
    netProfit: revenue - cogs - operatingExpenses,
  };
}

export function summarizeRange(ledger: LedgerEntry[], fromDay: number, toDay: number): DailyFinancialSummary {
  const summaries = [];
  for (let day = fromDay; day <= toDay; day++) summaries.push(summarizeDay(ledger, day));
  return summaries.reduce(
    (acc, s) => ({
      gameDay: toDay,
      revenue: acc.revenue + s.revenue,
      cogs: acc.cogs + s.cogs,
      grossProfit: acc.grossProfit + s.grossProfit,
      operatingExpenses: acc.operatingExpenses + s.operatingExpenses,
      netProfit: acc.netProfit + s.netProfit,
    }),
    { gameDay: toDay, revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, netProfit: 0 },
  );
}

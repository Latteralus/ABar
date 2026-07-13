import type { Cents, GameState, LedgerEntry } from "@/types";

export interface CashFlowSummary {
  gameDayStart: number;
  gameDayEnd: number;
  operatingCashFlow: Cents;
  investingCashFlow: Cents;
  financingCashFlow: Cents;
  netCashFlow: Cents;
  beginningCash: Cents;
  endingCash: Cents;
}

type CashFlowBucket = "operating" | "investing" | "financing";

/**
 * Every real cash movement in the codebase posts a paired `asset_cash` entry (verified across
 * payments.ts/commandService.ts/finance.ts/newGameService.ts) — credit = cash increase, debit =
 * cash decrease, per how those entries are actually posted. This closed, small set of call sites
 * is what makes description-prefix matching safe here (there are only ~9 templates, all owned by
 * this codebase, not arbitrary user text).
 */
function classifyAssetCashEntry(entry: LedgerEntry, loanId: string | undefined): CashFlowBucket {
  if (loanId && entry.relatedEntityId === loanId) return "financing";
  if (entry.description === "Owner starting capital" || entry.description === "Startup loan proceeds") return "financing";
  if (entry.description.startsWith("Equipment purchase") || entry.description.startsWith("Attraction purchase")) return "investing";
  return "operating";
}

function signedAmount(entry: LedgerEntry): Cents {
  return entry.type === "credit" ? entry.amount : -entry.amount;
}

/** Cash balance as of the end of `day`, reconstructed from the ledger's asset_cash entries (reliable from a $0 baseline at game genesis since every cash-affecting command posts one). */
export function cashAsOfDay(state: GameState, day: number): Cents {
  return state.ledger
    .filter((e) => e.category === "asset_cash" && e.gameDay <= day)
    .reduce((sum, e) => sum + signedAmount(e), 0);
}

export function summarizeCashFlow(state: GameState, fromGameDay: number, toGameDay: number): CashFlowSummary {
  const entriesInRange = state.ledger.filter((e) => e.category === "asset_cash" && e.gameDay >= fromGameDay && e.gameDay <= toGameDay);

  let operatingCashFlow = 0;
  let investingCashFlow = 0;
  let financingCashFlow = 0;
  for (const entry of entriesInRange) {
    const amount = signedAmount(entry);
    const bucket = classifyAssetCashEntry(entry, state.loan?.id);
    if (bucket === "operating") operatingCashFlow += amount;
    else if (bucket === "investing") investingCashFlow += amount;
    else financingCashFlow += amount;
  }

  return {
    gameDayStart: fromGameDay,
    gameDayEnd: toGameDay,
    operatingCashFlow,
    investingCashFlow,
    financingCashFlow,
    netCashFlow: operatingCashFlow + investingCashFlow + financingCashFlow,
    beginningCash: cashAsOfDay(state, fromGameDay - 1),
    endingCash: cashAsOfDay(state, toGameDay),
  };
}

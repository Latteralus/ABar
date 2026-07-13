import { createId } from "@/services/idService";
import type { GameState, LedgerCategory, LedgerEntry } from "@/types";

/** Shared ledger-entry constructor — was copy-pasted identically into 6 engine files (finance, payments,
 * employeeAI, spoilage, attractionRevenue, attractionTasks); this is the one definition now. */
export function postLedger(state: GameState, entry: Omit<LedgerEntry, "id" | "gameMinute" | "gameDay">): void {
  state.ledger.push({ id: createId("ledger"), gameMinute: state.gameMinute, gameDay: state.gameDay, ...entry });
}

interface CashMovementOptions {
  /** Paired non-cash ledger entry (expense/revenue/liability category). Omit for a pure balance-sheet
   * asset swap (e.g. inventory/equipment purchase) that should only ever post the asset_cash entry. */
  category?: LedgerCategory;
  description: string;
  relatedEntityId?: string;
}

/**
 * Decrements `state.cash` and posts the paired ledger entries in one call. This is the invariant
 * documented in PROJECT_STATUS.md Section 3 ("every state.cash mutation must post a paired
 * asset_cash entry") — previously enforced only by convention, which is how two real bugs (contract
 * repairs, initial game funding) slipped through an earlier audit. Routing every cash decrease
 * through here makes that invariant structural instead of a rule someone has to remember.
 */
export function spendCash(state: GameState, amountCents: number, options: CashMovementOptions): void {
  state.cash -= amountCents;
  if (options.category) {
    postLedger(state, {
      category: options.category,
      type: "debit",
      amount: amountCents,
      description: options.description,
      relatedEntityId: options.relatedEntityId,
    });
  }
  postLedger(state, {
    category: "asset_cash",
    type: "debit",
    amount: amountCents,
    description: options.description,
    relatedEntityId: options.relatedEntityId,
  });
}

/** Increments `state.cash` and posts the paired ledger entries — the credit-side counterpart to `spendCash`. */
export function receiveCash(state: GameState, amountCents: number, options: CashMovementOptions): void {
  state.cash += amountCents;
  if (options.category) {
    postLedger(state, {
      category: options.category,
      type: "credit",
      amount: amountCents,
      description: options.description,
      relatedEntityId: options.relatedEntityId,
    });
  }
  postLedger(state, {
    category: "asset_cash",
    type: "credit",
    amount: amountCents,
    description: options.description,
    relatedEntityId: options.relatedEntityId,
  });
}

import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { summarizeCashFlow, cashAsOfDay } from "@/simulation/engine/cashFlow";

describe("cash flow", () => {
  it("classifies an equipment purchase as investing and a loan payment as financing", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: true });
    const bus = new EventBus();
    state.cash = 100_000_00;
    // Advance past day 1 so this day's asset_cash entries don't also include the initial
    // owner-capital/loan-proceeds financing entries posted at game creation.
    state.gameDay = 2;

    commandService.purchaseEquipment(state, bus, "equip-cook-station");
    commandService.makeLoanPayment(state, bus, 50_000);

    const cashFlow = summarizeCashFlow(state, state.gameDay, state.gameDay);

    expect(cashFlow.investingCashFlow).toBe(-2_500_00);
    expect(cashFlow.financingCashFlow).toBe(-50_000);
  });

  it("classifies a sale as operating and reconciles beginning + net = ending cash", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.ledger.push({
      id: "sale-1",
      gameMinute: 0,
      gameDay: state.gameDay,
      category: "asset_cash",
      type: "credit",
      amount: 1_500,
      description: "Cash received — tab #1",
    });
    state.cash += 1_500;

    const cashFlow = summarizeCashFlow(state, state.gameDay, state.gameDay);

    expect(cashFlow.operatingCashFlow).toBe(1_500);
    expect(cashFlow.beginningCash + cashFlow.netCashFlow).toBe(cashFlow.endingCash);
    expect(cashAsOfDay(state, state.gameDay)).toBe(state.cash);
  });
});

import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { HIRING_CONFIG } from "@/config/employeeConfig";

describe("hiring cost", () => {
  it("charges the candidate-search cost and posts opex_recruiting + asset_cash", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const cashBefore = state.cash;

    const result = commandService.searchForCandidates(state, new EventBus(), "bartender");

    expect(result.success).toBe(true);
    expect(state.cash).toBe(cashBefore - HIRING_CONFIG.candidateSearchCostCents);
    expect(state.ledger.some((e) => e.category === "opex_recruiting" && e.amount === HIRING_CONFIG.candidateSearchCostCents)).toBe(true);
    expect(
      state.ledger.some((e) => e.category === "asset_cash" && e.type === "debit" && e.amount === HIRING_CONFIG.candidateSearchCostCents),
    ).toBe(true);
  });

  it("refuses the search when cash is insufficient and charges nothing", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.cash = 100;

    const result = commandService.searchForCandidates(state, new EventBus(), "server");

    expect(result.success).toBe(false);
    expect(state.cash).toBe(100);
  });
});

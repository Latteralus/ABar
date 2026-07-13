import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { activePromotionDemandMultiplier, effectivePrice, expireEndedPromotions } from "@/simulation/engine/advertising";

describe("advertising", () => {
  it("purchasePromotion validates cash, charges opex_advertising + asset_cash, and rejects a duplicate", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const bus = new EventBus();
    const cashBefore = state.cash;

    const result = commandService.purchasePromotion(state, bus, "promo-flyers");

    expect(result.success).toBe(true);
    expect(state.cash).toBe(cashBefore - 50_00);
    expect(state.ledger.some((e) => e.category === "opex_advertising" && e.amount === 50_00)).toBe(true);
    expect(
      state.ledger.filter((e) => e.category === "asset_cash").reduce((s, e) => s + (e.type === "credit" ? e.amount : -e.amount), 0),
    ).toBe(state.cash);

    const duplicate = commandService.purchasePromotion(state, bus, "promo-flyers");
    expect(duplicate.success).toBe(false);
  });

  it("rejects a promotion the player can't afford", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.cash = 0;
    const result = commandService.purchasePromotion(state, new EventBus(), "promo-radio");
    expect(result.success).toBe(false);
  });

  it("demand multiplier is 0 bonus before delayDays and rises toward the peak partway through the ramp", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.gameDay = 10;
    commandService.purchasePromotion(state, new EventBus(), "promo-radio"); // delayDays 2, durationDays 7, peak 1.25

    state.gameDay = 11; // 1 day elapsed, still within the 2-day delay
    expect(activePromotionDemandMultiplier(state)).toBe(1);

    state.gameDay = 14; // 4 days elapsed — the ramp's midpoint, at the peak
    expect(activePromotionDemandMultiplier(state)).toBeCloseTo(1.25, 5);
  });

  it("effectivePrice discounts only while a matching happy-hour/drink-special is active, and never touches food during happy hour", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    expect(effectivePrice(state, "prod-rum-cola", 800)).toBe(800);

    commandService.purchasePromotion(state, new EventBus(), "promo-happy-hour"); // 20% off, all drinks, day 1 only
    expect(effectivePrice(state, "prod-rum-cola", 800)).toBe(640);
    expect(effectivePrice(state, "prod-burger", 1200)).toBe(1200); // food unaffected

    state.gameDay = 2; // promo's single active day has passed
    expect(effectivePrice(state, "prod-rum-cola", 800)).toBe(800);
  });

  it("expireEndedPromotions removes promotions past their end day", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    commandService.purchasePromotion(state, new EventBus(), "promo-happy-hour"); // durationDays 1
    expect(state.activePromotions).toHaveLength(1);

    state.gameDay = 2;
    expireEndedPromotions(state, new EventBus());
    expect(state.activePromotions).toHaveLength(0);
  });
});

import { getAdvertisingCatalogEntry } from "@/data/advertising/advertisingCatalog";
import { getProduct } from "@/data/products/products";
import type { EventBus } from "@/simulation/events/EventBus";
import type { ActivePromotion, Cents, GameState, PromotionCatalogEntry } from "@/types";
import { logActivity } from "./activityLogger";

/**
 * Ramp contribution for one promotion on the given day (Master Plan Section 30: delay, then a
 * rise to peak, then a decline back to baseline by the end of the run). Single-day promotions
 * (drink_special/happy_hour/live_entertainment, duration 1) just return the full peak for their
 * one active day — there's no ramp to speak of at that length.
 */
function promotionDemandContribution(entry: PromotionCatalogEntry, promo: ActivePromotion, gameDay: number): number {
  const daysElapsed = gameDay - promo.startedGameDay;
  if (daysElapsed < 0 || daysElapsed >= entry.durationDays || daysElapsed < entry.delayDays) return 0;

  const peakBonus = entry.peakDemandMultiplier - 1;
  const effectiveDays = entry.durationDays - entry.delayDays;
  if (effectiveDays <= 1) return peakBonus;

  const rampProgress = daysElapsed - entry.delayDays;
  const midpoint = (effectiveDays - 1) / 2;
  if (rampProgress <= midpoint) {
    return midpoint === 0 ? peakBonus : peakBonus * (rampProgress / midpoint);
  }
  const declineSpan = effectiveDays - 1 - midpoint;
  return declineSpan === 0 ? peakBonus : peakBonus * Math.max(0, 1 - (rampProgress - midpoint) / declineSpan);
}

/** Combined bonus from every active campaign/promotion, applied as a multiplier on arrival demand — never guarantees customers, only shifts the odds (Master Plan Section 30). */
export function activePromotionDemandMultiplier(state: GameState): number {
  let totalBonus = 0;
  for (const promo of state.activePromotions) {
    const entry = getAdvertisingCatalogEntry(promo.catalogId);
    totalBonus += promotionDemandContribution(entry, promo, state.gameDay);
  }
  return 1 + totalBonus;
}

/** Applies the largest applicable happy-hour/drink-special discount, if any is currently running — a real price change, not cosmetic. */
export function effectivePrice(state: GameState, productId: string, basePrice: Cents): Cents {
  const product = getProduct(productId);
  let bestDiscountPercent = 0;

  for (const promo of state.activePromotions) {
    if (state.gameDay < promo.startedGameDay || state.gameDay > promo.endsGameDay) continue;
    const entry = getAdvertisingCatalogEntry(promo.catalogId);
    if (!entry.priceDiscountPercent) continue;
    if (entry.channel === "drink_special" && entry.targetProductId !== productId) continue;
    if (entry.channel === "happy_hour" && product.category === "food") continue;
    bestDiscountPercent = Math.max(bestDiscountPercent, entry.priceDiscountPercent);
  }

  if (bestDiscountPercent <= 0) return basePrice;
  return Math.round(basePrice * (1 - bestDiscountPercent / 100));
}

/** Removes promotions past their end day — called once per day close. No historical record is kept once a promotion expires (its cost stays visible in the ledger, but per-campaign reporting only covers what's currently active — a deliberate scope cut). */
export function expireEndedPromotions(state: GameState, bus: EventBus): void {
  const stillActive: ActivePromotion[] = [];
  for (const promo of state.activePromotions) {
    if (state.gameDay > promo.endsGameDay) {
      logActivity(state, bus, "advertising", `${promo.name} campaign ended.`);
    } else {
      stillActive.push(promo);
    }
  }
  state.activePromotions = stillActive;
}

export interface PromotionStats {
  promotion: ActivePromotion;
  daysElapsed: number;
  daysRemaining: number;
  currentDemandBonusPercent: number;
  estimatedExtraCustomersToday: number;
}

/** Rough, non-audited estimate for the reporting UI — same spirit as Attraction.estimatedSecondarySalesCents elsewhere. */
export function computePromotionStats(state: GameState): PromotionStats[] {
  const recentReports = state.dailyReports.slice(-7);
  const avgDailyCustomers = recentReports.length > 0 ? recentReports.reduce((s, r) => s + r.customerCount, 0) / recentReports.length : 0;

  return state.activePromotions.map((promo) => {
    const entry = getAdvertisingCatalogEntry(promo.catalogId);
    const contribution = promotionDemandContribution(entry, promo, state.gameDay);
    return {
      promotion: promo,
      daysElapsed: state.gameDay - promo.startedGameDay,
      daysRemaining: Math.max(0, promo.endsGameDay - state.gameDay),
      currentDemandBonusPercent: Math.round(contribution * 100),
      estimatedExtraCustomersToday: Math.round(contribution * avgDailyCustomers),
    };
  });
}

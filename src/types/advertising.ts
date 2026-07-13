import type { Cents, EntityId } from "./common";

/** Master Plan Section 30. The first four build awareness gradually over several days; the last three affect only the one operating day they're launched on. */
export type PromotionChannel = "newspaper" | "flyers" | "radio" | "social_media" | "drink_special" | "happy_hour" | "live_entertainment";

export interface PromotionCatalogEntry {
  id: string;
  channel: PromotionChannel;
  name: string;
  description: string;
  costCents: Cents;
  durationDays: number;
  /** Days after launch before the effect starts ramping up — 0 for same-day promotions. */
  delayDays: number;
  /** Demand multiplier at the peak of the ramp, e.g. 1.15 = +15% arrival chance at peak. */
  peakDemandMultiplier: number;
  /** drink_special/happy_hour only — 0-100 percent off the affected product(s) while active. */
  priceDiscountPercent?: number;
  /** drink_special only — undefined means every drink (happy_hour's implicit scope). */
  targetProductId?: string;
}

export interface ActivePromotion {
  id: EntityId;
  catalogId: string;
  channel: PromotionChannel;
  name: string;
  startedGameDay: number;
  endsGameDay: number;
  costCents: Cents;
}

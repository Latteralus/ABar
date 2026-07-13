import type { PromotionCatalogEntry } from "@/types";

/** Master Plan Section 30 — 7 promotion types differing by cost, duration, delay, peak effect, and (for the two drink-focused ones) a real price discount. */
export const ADVERTISING_CATALOG: readonly PromotionCatalogEntry[] = [
  {
    id: "promo-flyers",
    channel: "flyers",
    name: "Flyers",
    description: "Cheap, local, and fast to distribute. Small, short-lived awareness boost.",
    costCents: 50_00,
    durationDays: 3,
    delayDays: 0,
    peakDemandMultiplier: 1.08,
  },
  {
    id: "promo-newspaper",
    channel: "newspaper",
    name: "Local Newspaper Ad",
    description: "A modest classified ad reaching the neighborhood's regular readers.",
    costCents: 150_00,
    durationDays: 5,
    delayDays: 1,
    peakDemandMultiplier: 1.15,
  },
  {
    id: "promo-radio",
    channel: "radio",
    name: "Radio Spot",
    description: "A run of spots on a local station. Wider reach, takes a day or two to build.",
    costCents: 400_00,
    durationDays: 7,
    delayDays: 2,
    peakDemandMultiplier: 1.25,
  },
  {
    id: "promo-social-media",
    channel: "social_media",
    name: "Social Media Campaign",
    description: "Targeted posts and boosted ads. Builds slowly but reaches the widest audience.",
    costCents: 300_00,
    durationDays: 6,
    delayDays: 1,
    peakDemandMultiplier: 1.2,
  },
  {
    id: "promo-drink-special",
    channel: "drink_special",
    name: "One-Night Drink Special",
    description: "A discounted feature drink for one night only, promoted the same day.",
    costCents: 40_00,
    durationDays: 1,
    delayDays: 0,
    peakDemandMultiplier: 1.1,
    priceDiscountPercent: 30,
    targetProductId: "prod-rum-cola",
  },
  {
    id: "promo-happy-hour",
    channel: "happy_hour",
    name: "Happy Hour",
    description: "Discounted drinks bar-wide for one day, driving extra foot traffic.",
    costCents: 30_00,
    durationDays: 1,
    delayDays: 0,
    peakDemandMultiplier: 1.15,
    priceDiscountPercent: 20,
  },
  {
    id: "promo-live-entertainment",
    channel: "live_entertainment",
    name: "Live Entertainment Night",
    description: "A local act performs for the night — draws a crowd and lifts the mood, no discount.",
    costCents: 120_00,
    durationDays: 1,
    delayDays: 0,
    peakDemandMultiplier: 1.2,
  },
];

export function getAdvertisingCatalogEntry(id: string): PromotionCatalogEntry {
  const entry = ADVERTISING_CATALOG.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown advertising catalog id: ${id}`);
  return entry;
}

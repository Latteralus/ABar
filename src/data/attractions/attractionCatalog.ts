import { formatCents } from "@/utils/money";
import type { AttractionCategory } from "@/types";

/** Static metadata for attractions the player may purchase. Per-type tunables (price, duration, participant limits, queue capacity) live here; behavior formulas shared across every type live in config/attractionConfig.ts. */
export interface AttractionCatalogEntry {
  id: string;
  name: string;
  category: AttractionCategory;
  purchasePrice: number;
  /** Physical floor space this attraction occupies — checked against Property.attractionFloorSpaceUnits at purchase time (a hard cap, unlike storage capacity). */
  floorSpaceUnits: number;
  pricePerGameCents: number;
  gameDurationMinutes: number;
  minParticipants: number;
  maxParticipants: number;
  /** Maximum number of queued parties waiting at once; a party that would exceed this is turned away instead of queued. */
  queueCapacityParties: number;
  /** Interpolated into "{name} was taken out of service due to {breakdownDescription}." in attractionCondition.ts — lets each category have its own flavor without new engine branching. */
  breakdownDescription: string;
}

export const ATTRACTION_CATALOG: readonly AttractionCatalogEntry[] = [
  {
    id: "attraction-pool-table",
    name: "Pool Table",
    category: "pool_table",
    purchasePrice: 1_800_00,
    floorSpaceUnits: 30,
    pricePerGameCents: 200,
    gameDurationMinutes: 18,
    // A single customer can rack up and play alone — real pool tables aren't 2-player-minimum.
    // Groups of 2-4 still play together as one party when they queue as an existing arrival group.
    minParticipants: 1,
    maxParticipants: 4,
    queueCapacityParties: 3,
    breakdownDescription: "a damaged cue",
  },
  {
    id: "attraction-darts",
    name: "Dartboard",
    category: "darts",
    purchasePrice: 700_00,
    floorSpaceUnits: 10,
    pricePerGameCents: 150,
    gameDurationMinutes: 12,
    // Unlike pool, darts genuinely needs an opponent — this is the real consumer of
    // selectNextSession's synthetic minParticipants:2 case (see tests/attractions.test.ts).
    minParticipants: 2,
    maxParticipants: 4,
    queueCapacityParties: 2,
    breakdownDescription: "a damaged dartboard",
  },
  {
    id: "attraction-arcade-cabinet",
    name: "Arcade Cabinet",
    category: "arcade_cabinet",
    purchasePrice: 1_200_00,
    floorSpaceUnits: 8,
    pricePerGameCents: 100,
    gameDurationMinutes: 6,
    // Solo-friendly, fast turnover, cheap per game — the "quick nickel-and-dime" attraction.
    minParticipants: 1,
    maxParticipants: 2,
    queueCapacityParties: 4,
    breakdownDescription: "a jammed joystick",
  },
  {
    id: "attraction-karaoke-booth",
    name: "Karaoke Booth",
    category: "karaoke_booth",
    purchasePrice: 2_600_00,
    floorSpaceUnits: 24,
    pricePerGameCents: 600,
    gameDurationMinutes: 20,
    // A booked time slot, not a quick game — priced and timed accordingly, one flat fee per
    // session regardless of how many of the 1-4 people are in the booth.
    minParticipants: 1,
    maxParticipants: 4,
    queueCapacityParties: 2,
    breakdownDescription: "a malfunctioning karaoke machine",
  },
];

export function getAttractionCatalogEntry(id: string): AttractionCatalogEntry {
  const entry = ATTRACTION_CATALOG.find((item) => item.id === id);
  if (!entry) throw new Error(`Unknown attraction catalog id: ${id}`);
  return entry;
}

export function getAttractionCatalogEntryForCategory(category: AttractionCategory): AttractionCatalogEntry {
  const entry = ATTRACTION_CATALOG.find((item) => item.category === category);
  if (!entry) throw new Error(`No catalog entry for attraction category: ${category}`);
  return entry;
}

/** Plain-language explanation of what an attraction actually does, matching equipmentCatalog.ts's describeEquipmentBenefit convention. */
export function describeAttractionBenefit(entry: AttractionCatalogEntry): string {
  return `Seats ${entry.minParticipants}-${entry.maxParticipants} players per game, suggested ${formatCents(entry.pricePerGameCents)}/game, ~${entry.gameDurationMinutes} min games. Generates direct usage revenue, extends visit length, and creates extra drink-order opportunities while customers play.`;
}

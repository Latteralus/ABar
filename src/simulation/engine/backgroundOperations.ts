import { getProperty } from "@/data/properties";
import { REAL_ESTATE_CONFIG } from "@/config/realEstateConfig";
import { receiveCash, spendCash } from "./ledger";
import { logActivity } from "./activityLogger";
import type { EventBus } from "@/simulation/events/EventBus";
import type { BackgroundEstimateProfile, GameState, OwnedPropertyState } from "@/types";

/**
 * Snapshots a property's trailing real performance the moment it's switched away from (see
 * commandService.switchActiveProperty) — reused unchanged for every day it stays "background."
 * `sampleDayCount: 0` (no `dailyReports` yet) means this property has never been active a single
 * day, so nothing gets fabricated for it until it has real history to draw from.
 */
export function computeBackgroundEstimateProfile(prop: OwnedPropertyState, gameDay: number): BackgroundEstimateProfile {
  const recentReports = prop.dailyReports.slice(-REAL_ESTATE_CONFIG.backgroundEstimateTrailingDays);
  const sampleDayCount = recentReports.length;
  if (sampleDayCount === 0) {
    return {
      averageDailyRevenue: 0,
      averageDailyCogs: 0,
      averageDailyCustomerCount: 0,
      averageDailyInventoryConsumedUnits: 0,
      sampleDayCount: 0,
      computedAtGameDay: gameDay,
    };
  }

  const sum = (pick: (r: (typeof recentReports)[number]) => number) => recentReports.reduce((s, r) => s + pick(r), 0);
  return {
    averageDailyRevenue: Math.round(sum((r) => r.revenue) / sampleDayCount),
    averageDailyCogs: Math.round(sum((r) => r.cogs) / sampleDayCount),
    averageDailyCustomerCount: Math.round(sum((r) => r.customerCount) / sampleDayCount),
    averageDailyInventoryConsumedUnits: sum((r) => r.inventoryConsumedUnits) / sampleDayCount,
    sampleDayCount,
    computedAtGameDay: gameDay,
  };
}

/** Draws down inventory proportional to each item's current on-hand share — never below zero, and a no-op once a property has nothing left to draw from. */
function applyBackgroundInventoryDrawdown(prop: OwnedPropertyState, totalUnits: number): void {
  if (totalUnits <= 0) return;
  const totalOnHand = prop.inventory.reduce((sum, item) => sum + item.quantityOnHand, 0);
  if (totalOnHand <= 0) return;

  for (const item of prop.inventory) {
    if (item.quantityOnHand <= 0) continue;
    const share = item.quantityOnHand / totalOnHand;
    const consumed = Math.min(item.quantityOnHand, totalUnits * share);
    item.quantityOnHand -= consumed;
    item.recentUsage += consumed;
  }
}

/**
 * The daily pass for every owned property that ISN'T currently active (called once per close from
 * dayCycle.closeDay, after the active property's real day is processed). Posts an estimated
 * revenue/COGS pair tagged with this property so consolidated financials can still slice by
 * location, and draws down inventory proportionally — but never pushes a `dailyReports` entry,
 * since that array is the real history the estimate itself is computed from.
 */
export function runBackgroundPropertyDay(state: GameState, prop: OwnedPropertyState, bus: EventBus): void {
  const estimate = prop.backgroundEstimate;
  if (!estimate || estimate.sampleDayCount === 0) {
    logActivity(
      state,
      bus,
      "system",
      `${getProperty(prop.propertyId).name} has no trailing history yet — nothing estimated for Day ${state.gameDay}.`,
    );
    return;
  }

  if (estimate.averageDailyRevenue > 0) {
    receiveCash(state, estimate.averageDailyRevenue, {
      category: "revenue_background_estimate",
      description: `${getProperty(prop.propertyId).name} — estimated revenue, Day ${state.gameDay}`,
      propertyId: prop.propertyId,
    });
  }
  if (estimate.averageDailyCogs > 0) {
    spendCash(state, estimate.averageDailyCogs, {
      category: "cogs_background_estimate",
      description: `${getProperty(prop.propertyId).name} — estimated COGS, Day ${state.gameDay}`,
      propertyId: prop.propertyId,
    });
  }

  applyBackgroundInventoryDrawdown(prop, estimate.averageDailyInventoryConsumedUnits);
}

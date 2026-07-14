import { GAME_TIME_CONFIG } from "@/config/gameConfig";
import { SPOILAGE_CONFIG } from "@/config/spoilageConfig";
import type { EventBus } from "@/simulation/events/EventBus";
import type { GameState, InventoryItem, OwnedPropertyState, Property, StorageLocation } from "@/types";
import { logActivity } from "./activityLogger";
import { postLedger } from "./ledger";
import { isEquipmentUsable } from "./equipmentMaintenance";

export type StoragePool = "general" | "refrigerated" | "frozen";

export const POOL_BY_STORAGE_LOCATION: Record<StorageLocation, StoragePool> = {
  general: "general",
  bar_stock: "general",
  kitchen_stock: "general",
  refrigerated: "refrigerated",
  frozen: "frozen",
};

export interface StorageUsage {
  general: { used: number; capacity: number };
  refrigerated: { used: number; capacity: number };
  frozen: { used: number; capacity: number };
}

/** Storage capacity, per pool: general comes from the property, refrigerated/frozen from owned equipment (Master Plan Section 15). */
export function getStorageUsage(prop: OwnedPropertyState, property: Property): StorageUsage {
  const usage: StorageUsage = {
    general: { used: 0, capacity: property.storageCapacityUnits },
    refrigerated: { used: 0, capacity: 0 },
    frozen: { used: 0, capacity: 0 },
  };

  for (const equipment of prop.equipment) {
    // A failed unit provides none of its capacity — it's not actually keeping anything cold/dry.
    if (!isEquipmentUsable(equipment)) continue;
    if (equipment.category === "refrigerator") usage.refrigerated.capacity += equipment.capacity ?? 0;
    if (equipment.category === "freezer") usage.frozen.capacity += equipment.capacity ?? 0;
    if (equipment.category === "storage_shelving") usage.general.capacity += equipment.capacity ?? 0;
  }

  for (const item of prop.inventory) {
    usage[POOL_BY_STORAGE_LOCATION[item.storageLocation]].used += item.quantityOnHand;
  }

  return usage;
}

/**
 * Ages every perishable item by one operating day and spoils whatever's left once it exceeds
 * effective shelf life (Master Plan Section 16). There's no per-batch/lot tracking — the whole
 * pool for an item shares one "days since last restock" clock, same simplification as the
 * existing single averageUnitCost pool (see PROJECT_STATUS.md Section 6). Returns total units
 * wasted, for the daily report.
 */
export function applySpoilage(state: GameState, prop: OwnedPropertyState, bus: EventBus, property: Property): number {
  const usage = getStorageUsage(prop, property);
  let wastedUnitsTotal = 0;
  let totalWasteCostCents = 0;

  for (const item of prop.inventory as InventoryItem[]) {
    if (item.shelfLifeGameMinutes === undefined) continue;
    item.daysSinceLastRestock += 1;

    const pool = usage[POOL_BY_STORAGE_LOCATION[item.storageLocation]];
    const overCapacity = pool.used > pool.capacity;
    const shelfLifeDays = item.shelfLifeGameMinutes / GAME_TIME_CONFIG.operatingDayLengthMinutes;
    const effectiveShelfLifeDays = overCapacity ? shelfLifeDays * SPOILAGE_CONFIG.improperStorageShelfLifeMultiplier : shelfLifeDays;

    if (item.quantityOnHand <= 0 || item.daysSinceLastRestock < effectiveShelfLifeDays) continue;

    const wastedQuantity = item.quantityOnHand;
    const costCents = Math.round(item.averageUnitCost * wastedQuantity);
    wastedUnitsTotal += wastedQuantity;
    totalWasteCostCents += costCents;

    logActivity(
      state,
      bus,
      "inventory",
      `${wastedQuantity} ${item.name} spoiled past shelf life and were thrown out ($${(costCents / 100).toFixed(2)} lost).`,
      "warning",
      item.id,
    );

    item.quantityOnHand = 0;
    item.daysSinceLastRestock = 0;
  }

  if (totalWasteCostCents > 0) {
    postLedger(state, {
      category: "cogs_spoilage",
      type: "debit",
      amount: totalWasteCostCents,
      description: `Spoiled inventory written off — Day ${state.gameDay}`,
      propertyId: prop.propertyId,
    });
  }

  return wastedUnitsTotal;
}

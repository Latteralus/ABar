import { REPUTATION_CONFIG } from "@/config/reputationConfig";
import { INVENTORY_CATALOG } from "@/data/products/inventoryCatalog";
import { PRODUCT_CATALOG } from "@/data/products/products";
import type { AcquisitionType, GameMinute, InventoryItem, MenuListing, OwnedPropertyState, Property } from "@/types";

function buildStartingInventory(): InventoryItem[] {
  return INVENTORY_CATALOG.map((entry) => ({
    id: entry.id,
    name: entry.name,
    category: entry.category,
    unit: entry.unit,
    quantityOnHand: 0,
    averageUnitCost: entry.baseUnitCostCents,
    storageLocation: entry.storageLocation,
    shelfLifeGameMinutes: entry.shelfLifeGameMinutes,
    daysSinceLastRestock: 0,
    requiresRefrigeration: entry.requiresRefrigeration,
    requiresFreezer: entry.requiresFreezer,
    reorderMinimum: entry.reorderMinimum,
    reorderTarget: entry.reorderTarget,
    pendingDeliveryQuantity: 0,
    recentUsage: 0,
  }));
}

function buildStartingMenu(): MenuListing[] {
  return PRODUCT_CATALOG.map((product) => ({ productId: product.id, price: product.suggestedPrice, isActive: false }));
}

/**
 * Builds a fresh OwnedPropertyState for a newly acquired property — used both for the very first
 * property at new-game creation (newGameService.createNewGameState) and for every later
 * lease/buy (commandService.leaseOrBuyProperty), so both paths start a location identically.
 */
export function createOwnedPropertyState(
  catalogEntry: Property,
  acquisitionType: AcquisitionType,
  gameDay: number,
  gameMinute: GameMinute,
): OwnedPropertyState {
  return {
    propertyId: catalogEntry.id,
    acquisitionType,
    acquiredAtGameMinute: gameMinute,
    acquiredAtGameDay: gameDay,
    lastActiveGameDay: gameDay,

    employees: [],
    customers: [],
    customerGroups: [],

    inventory: buildStartingInventory(),
    purchaseOrders: [],
    equipment: catalogEntry.existingEquipment.map((e) => ({ ...e, currentStatus: "operational" as const, repairHistory: [] })),
    attractions: [],

    menu: buildStartingMenu(),

    barCleanliness: 100,

    tabs: [],
    receipts: [],
    tasks: [],
    orders: [],

    reputation: { score: REPUTATION_CONFIG.startingScore, history: [] },
    reviews: [],
    activePromotions: [],
    dailyReports: [],
    bills: [],
  };
}

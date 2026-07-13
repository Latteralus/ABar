import type { Cents, EntityId, GameMinute } from "./common";

export type InventoryCategory = "liquor" | "beer" | "soft_drink" | "mixer" | "garnish" | "food" | "supply";

export type InventoryUnit = "bottle" | "case" | "keg" | "ounce" | "fluid_ounce" | "serving" | "pound" | "unit" | "portion";

export type StorageLocation = "general" | "refrigerated" | "frozen" | "bar_stock" | "kitchen_stock";

export interface InventoryItem {
  id: EntityId;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  quantityOnHand: number;
  /** Weighted average cost per unit, in cents, updated on each delivery. */
  averageUnitCost: Cents;
  storageLocation: StorageLocation;
  /** Perishable items only. Undefined means the item never spoils. */
  shelfLifeGameMinutes?: number;
  /** Operating days elapsed since this item's pool was last topped up by a delivery. Reset to 0 on delivery; used as the spoilage age proxy for the whole (unbatched) pool. */
  daysSinceLastRestock: number;
  requiresRefrigeration: boolean;
  requiresFreezer: boolean;
  reorderMinimum: number;
  reorderTarget: number;
  pendingDeliveryQuantity: number;
  /** Rolling count of units consumed during the current operating day, reset at close. */
  recentUsage: number;
}

export interface PurchaseOrderLine {
  inventoryItemId: EntityId;
  quantity: number;
  unitCost: Cents;
}

export type PurchaseOrderStatus = "pending" | "delivered" | "cancelled";
export type PurchaseOrderPaymentStatus = "paid" | "on_tab";

export interface PurchaseOrder {
  id: EntityId;
  orderNumber: number;
  orderedAtGameMinute: GameMinute;
  expectedDeliveryGameMinute: GameMinute;
  lines: PurchaseOrderLine[];
  totalCost: Cents;
  paymentStatus: PurchaseOrderPaymentStatus;
  deliveryStatus: PurchaseOrderStatus;
}

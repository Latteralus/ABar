import { getProduct } from "@/data/products/products";
import { getRecipeForProduct, ALCOHOLIC_PRODUCT_IDS } from "@/data/recipes/recipes";
import { CUSTOMER_BEHAVIOR_CONFIG } from "@/config/customerConfig";
import { createId } from "@/services/idService";
import { createServiceTask } from "@/simulation/tasks/taskQueue";
import { rolesFor } from "@/simulation/tasks/roleEligibility";
import { personalityWasteMultiplier } from "./personalityEffects";
import { equipmentWasteMultiplier, isEquipmentUsable } from "./equipmentMaintenance";
import { shouldOrderWhileAtAttraction } from "./customerAttractionDecisions";
import { effectivePrice } from "./advertising";
import { hasOperationalTv, shouldOrderWhileWatchingTv } from "./tvEffects";
import { customerSpentSoFar } from "./payments";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Customer, Employee, GameState, InventoryItem, MenuListing, Order, Product, ServiceTask } from "@/types";
import { logActivity } from "./activityLogger";

function getActiveMenu(state: GameState): MenuListing[] {
  return state.menu.filter((listing) => listing.isActive);
}

/** Whether the player owns *usable* equipment matching the product's recipe requirement, if any (Master Plan Sections 33-34). */
export function hasRequiredEquipment(state: GameState, productId: string): boolean {
  const recipe = getRecipeForProduct(productId);
  if (!recipe.requiredEquipmentCategory) return true;
  return state.equipment.some((e) => e.category === recipe.requiredEquipmentCategory && isEquipmentUsable(e));
}

/**
 * Picks a product for the customer, respecting budget, preference, and — per Section 11 —
 * refusing to offer alcohol to someone already at the service cutoff (`allowAlcohol=false`).
 */
function selectProductForCustomer(state: GameState, customer: Customer, rng: SeededRandom, allowAlcohol: boolean): MenuListing | null {
  const activeMenu = getActiveMenu(state);
  const affordable = activeMenu.filter((listing) => {
    if (effectivePrice(state, listing.productId, listing.price) > customer.spendingBudget - customerSpentSoFar(state, customer)) return false;
    if (!allowAlcohol && ALCOHOLIC_PRODUCT_IDS.has(listing.productId)) return false;
    if (!hasRequiredEquipment(state, listing.productId)) return false;
    return true;
  });
  if (affordable.length === 0) return null;

  const preferred = affordable.filter((listing) => {
    const product = getProduct(listing.productId);
    return customer.preferredCategories.includes(product.category);
  });

  const pool = preferred.length > 0 ? preferred : affordable;
  return rng.pick(pool);
}

function openOrReuseTab(state: GameState, customer: Customer): string {
  if (customer.tabId) return customer.tabId;
  const tab = {
    id: createId("tab"),
    tabNumber: state.counters.nextTabNumber++,
    customerId: customer.id,
    customerName: `${customer.firstName} ${customer.lastName}`,
    groupId: customer.groupId,
    openedAtGameMinute: state.gameMinute,
    closedAtGameMinute: null,
    lineItems: [],
    subtotal: 0,
    tax: 0,
    tip: 0,
    total: 0,
    paymentMethod: null,
    status: "open" as const,
  };
  state.tabs.push(tab);
  customer.tabId = tab.id;
  return tab.id;
}

/** Creates take_order / process_payment tasks for customers who need one but don't already have one queued. */
export function ensureOrderTasks(state: GameState, rng: SeededRandom, bus: EventBus): void {
  const hasTaskFor = (customerId: string, type: ServiceTask["type"]) =>
    state.tasks.some((t) => t.customerId === customerId && t.type === type && t.status !== "complete" && t.status !== "cancelled");

  for (const customer of state.customers) {
    // "Additional order probability" while queued or playing (customerAttractionDecisions.ts owns the actual chance formula) — reuses this exact take_order pipeline instead of a separate one.
    const atAttraction = customer.status === "using_attraction" || customer.status === "waiting_for_attraction";
    const watchingTv = (customer.status === "consuming" || customer.status === "deciding_next_order") && hasOperationalTv(state);
    const wantsToOrder =
      customer.status === "waiting_to_order" ||
      (atAttraction && shouldOrderWhileAtAttraction(rng, customer)) ||
      (watchingTv && shouldOrderWhileWatchingTv(rng, customer));
    if (wantsToOrder && !hasTaskFor(customer.id, "take_order")) {
      state.tasks.push(
        createServiceTask({
          type: "take_order",
          eligibleRoles: rolesFor("take_order"),
          requiredSkill: "serving",
          durationGameMinutes: 2,
          customerId: customer.id,
          createdAtGameMinute: state.gameMinute,
        }),
      );
    }
    if (customer.status === "waiting_to_pay" && !hasTaskFor(customer.id, "process_payment")) {
      state.tasks.push(
        createServiceTask({
          type: "process_payment",
          eligibleRoles: rolesFor("process_payment"),
          requiredSkill: "accuracy",
          durationGameMinutes: 2,
          priority: 2,
          customerId: customer.id,
          createdAtGameMinute: state.gameMinute,
        }),
      );
    }
  }
  void bus;
}

/** Speed multiplier applied to base task duration: skilled employees finish faster. */
export function speedMultiplierForSkill(speedSkill: number): number {
  return 1.4 - (speedSkill / 100) * 0.8; // 1.4x at skill 0, 0.6x at skill 100
}

/** Extra inventory consumed per unit of accuracy lost — models over-pouring/spillage. */
function wasteMultiplierForSkill(accuracySkill: number): number {
  return 1 + ((100 - accuracySkill) / 100) * 0.5; // up to 1.5x consumption at 0 accuracy
}

interface PrepResult {
  success: boolean;
  qualityResult: number;
  cogsCents: number;
  /** Portion of cogsCents attributable to over-pouring/spillage beyond the exact recipe amount. */
  wasteCostCents: number;
  missingItemName?: string;
  itemsCrossedReorderMinimum: InventoryItem[];
}

/** Consumes recipe ingredients from inventory, scaled by the preparing employee's accuracy and personality. */
export function consumeInventoryForOrder(state: GameState, order: Order, employee: Employee): PrepResult {
  const recipe = getRecipeForProduct(order.productId);
  const product = getProduct(order.productId);
  const accuracySkill = employee.skills.accuracy;
  const waste =
    wasteMultiplierForSkill(accuracySkill) *
    personalityWasteMultiplier(employee) *
    equipmentWasteMultiplier(state, recipe.requiredEquipmentCategory);
  // Food quality also rewards the cook's cooking skill, not just accuracy — drinks rely on accuracy alone.
  const qualitySkill = product.category === "food" ? (accuracySkill + employee.skills.cooking) / 2 : accuracySkill;
  const consumption = recipe.ingredients.map((ing) => ({
    item: state.inventory.find((i) => i.id === ing.inventoryItemId) as InventoryItem | undefined,
    quantity: ing.quantity * waste,
  }));

  const missing = consumption.find((c) => !c.item || c.item.quantityOnHand < c.quantity);
  if (missing) {
    return {
      success: false,
      qualityResult: 0,
      cogsCents: 0,
      wasteCostCents: 0,
      missingItemName: missing.item?.name ?? "an ingredient",
      itemsCrossedReorderMinimum: [],
    };
  }

  let cogsCents = 0;
  const itemsCrossedReorderMinimum: InventoryItem[] = [];
  for (const { item, quantity } of consumption) {
    const inv = item as InventoryItem;
    const wasAboveMinimum = inv.quantityOnHand >= inv.reorderMinimum;
    inv.quantityOnHand -= quantity;
    inv.recentUsage += quantity;
    cogsCents += Math.round(inv.averageUnitCost * quantity);
    if (wasAboveMinimum && inv.quantityOnHand < inv.reorderMinimum) {
      itemsCrossedReorderMinimum.push(inv);
    }
  }

  const wasteCostCents = waste > 1 ? Math.round(cogsCents * (1 - 1 / waste)) : 0;
  const quality = Math.max(0, Math.min(100, recipe.baseQuality * (0.7 + (qualitySkill / 100) * 0.3)));
  return { success: true, qualityResult: quality, cogsCents, wasteCostCents, itemsCrossedReorderMinimum };
}

/** Ideal-conditions ingredient cost for a product (no waste/skill/equipment penalties) — what the Menu & Pricing screen shows as "Cost". */
export function baseCostCentsForProduct(state: GameState, productId: string): number {
  const recipe = getRecipeForProduct(productId);
  return recipe.ingredients.reduce((sum, ing) => {
    const item = state.inventory.find((i) => i.id === ing.inventoryItemId);
    return sum + (item ? item.averageUnitCost * ing.quantity : 0);
  }, 0);
}

export function cogsCategoryForProduct(product: Product): "cogs_alcohol" | "cogs_soft_drink" | "cogs_food_ingredients" {
  if (product.category === "soft_drink") return "cogs_soft_drink";
  if (product.category === "food") return "cogs_food_ingredients";
  return "cogs_alcohol";
}

export function buildOrder(state: GameState, customer: Customer, listing: MenuListing): Order {
  const tabId = openOrReuseTab(state, customer);
  const order: Order = {
    id: createId("order"),
    customerId: customer.id,
    productId: listing.productId,
    tabId,
    status: "queued",
    createdAtGameMinute: state.gameMinute,
    preparedByEmployeeId: null,
    deliveredByEmployeeId: null,
  };
  state.orders.push(order);
  state.counters.nextOrderNumber++;
  customer.itemsOrderedCount += 1;
  return order;
}

export function getProductForOrder(order: Order): Product {
  return getProduct(order.productId);
}

export function isAlcoholic(productId: string): boolean {
  return ALCOHOLIC_PRODUCT_IDS.has(productId);
}

export { selectProductForCustomer, getActiveMenu };
export const INTOXICATION_PER_DRINK = CUSTOMER_BEHAVIOR_CONFIG.intoxicationPerAlcoholicDrink;

export function logNoAvailableProduct(state: GameState, bus: EventBus, customer: Customer): void {
  logActivity(
    state,
    bus,
    "customer",
    `${customer.firstName} ${customer.lastName} couldn't find anything on the menu they could afford.`,
    "warning",
  );
}

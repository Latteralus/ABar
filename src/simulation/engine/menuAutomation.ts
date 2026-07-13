import { getProduct } from "@/data/products/products";
import { getRecipeForProduct } from "@/data/recipes/recipes";
import { hasRequiredEquipment } from "./orderProcessing";
import { logActivity } from "./activityLogger";
import type { EventBus } from "@/simulation/events/EventBus";
import type { GameState } from "@/types";

function hasQualifiedEmployee(state: GameState, requiredRole: string): boolean {
  return state.employees.some((e) => e.role === requiredRole);
}

function hasEnoughSupplyForOne(state: GameState, productId: string): boolean {
  const recipe = getRecipeForProduct(productId);
  return recipe.ingredients.every((ing) => {
    const item = state.inventory.find((i) => i.id === ing.inventoryItemId);
    return !!item && item.quantityOnHand >= ing.quantity;
  });
}

/**
 * Auto-enables any never-touched menu item the bar can actually fulfill right now — owns the
 * required equipment, has a staff member in the recipe's required role, and has enough of every
 * ingredient on hand for at least one order. Skips any listing already active, and — crucially —
 * any listing where `hasBeenToggled` is set, which `commandService.setMenuActive` stamps the very
 * first time the player explicitly flips a listing on or off. That means a manual uncheck always
 * sticks permanently, even if capability is rechecked again later; this function can only ever
 * activate a listing the player has never personally touched. Called only at the moments
 * capability can newly become true (a hire, an equipment purchase, a delivery) — not on a
 * per-minute tick.
 */
export function ensureMenuAutoActivation(state: GameState, bus: EventBus): void {
  for (const listing of state.menu) {
    if (listing.isActive || listing.hasBeenToggled) continue;
    if (!hasRequiredEquipment(state, listing.productId)) continue;
    const recipe = getRecipeForProduct(listing.productId);
    if (!hasQualifiedEmployee(state, recipe.requiredRole)) continue;
    if (!hasEnoughSupplyForOne(state, listing.productId)) continue;

    listing.isActive = true;
    logActivity(state, bus, "system", `${getProduct(listing.productId).name} was automatically added to the menu — fully stocked and staffed.`);
  }
}

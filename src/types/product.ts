import type { Cents, EntityId, Percent0to100 } from "./common";
import type { EquipmentCategory } from "./equipment";

export type ProductCategory = "soft_drink" | "beer" | "liquor" | "mixed_drink" | "food";

export type EmployeeRole =
  | "bartender"
  | "server"
  | "cook"
  | "host"
  | "dishwasher"
  | "barback"
  | "security"
  | "maintenance"
  | "manager";

/** One ingredient consumption requirement within a recipe. */
export interface RecipeIngredient {
  inventoryItemId: EntityId;
  quantity: number;
}

/** Recipes are static configuration data, never created or edited by the player. */
export interface Recipe {
  id: EntityId;
  productId: EntityId;
  ingredients: RecipeIngredient[];
  /** Base seconds of employee time required at skill 50. */
  basePrepSeconds: number;
  requiredRole: EmployeeRole;
  requiredEquipmentCategory?: EquipmentCategory;
  baseQuality: Percent0to100;
}

export interface Product {
  id: EntityId;
  name: string;
  category: ProductCategory;
  /** Suggested price shown to the player; the player sets the actual active price. */
  suggestedPrice: Cents;
  /** Direct ingredient cost at zero waste, derived from the recipe + inventory costs at runtime. */
  recipeId: EntityId;
  description?: string;
}

/** A product the player has activated on their menu, with the price they've chosen. */
export interface MenuListing {
  productId: EntityId;
  price: Cents;
  isActive: boolean;
  /** Set the first time the player explicitly toggles this listing via commandService.setMenuActive (on or off). Once set, menuAutomation.ensureMenuAutoActivation leaves this listing alone forever — the player's explicit choice always wins over the auto-enable heuristic. Undefined on old saves is equivalent to false. */
  hasBeenToggled?: boolean;
}

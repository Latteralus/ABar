import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { getInventoryCatalogEntry } from "@/data/products/inventoryCatalog";
import { getProduct, PRODUCT_CATALOG } from "@/data/products/products";
import { ALCOHOLIC_PRODUCT_IDS, getRecipeForProduct, RECIPE_CATALOG } from "@/data/recipes/recipes";
import { hasRequiredEquipment } from "@/simulation/engine/orderProcessing";

const NEW_DRINK_PRODUCT_IDS = [
  "prod-draft-lager",
  "prod-margarita",
  "prod-cosmopolitan",
  "prod-mojito",
  "prod-screwdriver",
  "prod-martini",
  "prod-whiskey-sour",
  "prod-jello-shot",
];

describe("drink catalog", () => {
  it("every new drink product has a recipe whose ingredients resolve to real inventory items", () => {
    for (const productId of NEW_DRINK_PRODUCT_IDS) {
      const product = getProduct(productId);
      expect(product).toBeDefined();
      const recipe = getRecipeForProduct(productId);
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      for (const ingredient of recipe.ingredients) {
        expect(() => getInventoryCatalogEntry(ingredient.inventoryItemId)).not.toThrow();
        expect(ingredient.quantity).toBeGreaterThan(0);
      }
    }
  });

  it("every new drink product is registered as alcoholic", () => {
    for (const productId of NEW_DRINK_PRODUCT_IDS) {
      expect(ALCOHOLIC_PRODUCT_IDS.has(productId)).toBe(true);
    }
  });

  it("the full catalog has no duplicate ids and every recipe maps to a real product", () => {
    const productIds = new Set(PRODUCT_CATALOG.map((p) => p.id));
    expect(productIds.size).toBe(PRODUCT_CATALOG.length);
    for (const recipe of RECIPE_CATALOG) {
      expect(productIds.has(recipe.productId)).toBe(true);
    }
  });

  it("gates Draft Lager behind an owned draft_system, unlike bar_station drinks", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    expect(hasRequiredEquipment(state, "prod-draft-lager")).toBe(false);
    expect(hasRequiredEquipment(state, "prod-margarita")).toBe(true); // starter bar_station already covers this

    commandService.purchaseEquipment(state, new EventBus(), "equip-two-tap-draft");
    expect(hasRequiredEquipment(state, "prod-draft-lager")).toBe(true);
  });

  it("a keg-unit inventory item is consumed in small fractional pours", () => {
    const recipe = getRecipeForProduct("prod-draft-lager");
    const kegIngredient = recipe.ingredients.find((i) => i.inventoryItemId === "inv-draft-lager-keg");
    expect(kegIngredient).toBeDefined();
    expect(kegIngredient!.quantity).toBeLessThan(0.02);
    expect(getInventoryCatalogEntry("inv-draft-lager-keg").unit).toBe("keg");
  });
});

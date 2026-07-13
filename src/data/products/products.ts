import type { Product } from "@/types";

/** The full Stage 1 product catalog. Prices here are suggestions — the player sets the active menu price. */
export const PRODUCT_CATALOG: readonly Product[] = [
  { id: "prod-cola", name: "Cola", category: "soft_drink", suggestedPrice: 300, recipeId: "recipe-cola" },
  { id: "prod-lemon-lime", name: "Lemon-Lime Soda", category: "soft_drink", suggestedPrice: 300, recipeId: "recipe-lemon-lime" },
  { id: "prod-bottled-lager", name: "Bottled Lager", category: "beer", suggestedPrice: 500, recipeId: "recipe-bottled-lager" },
  { id: "prod-bottled-ipa", name: "Bottled IPA", category: "beer", suggestedPrice: 600, recipeId: "recipe-bottled-ipa" },
  { id: "prod-whiskey-shot", name: "Well Whiskey Shot", category: "liquor", suggestedPrice: 600, recipeId: "recipe-whiskey-shot" },
  { id: "prod-vodka-shot", name: "Well Vodka Shot", category: "liquor", suggestedPrice: 600, recipeId: "recipe-vodka-shot" },
  { id: "prod-rum-cola", name: "Rum and Cola", category: "mixed_drink", suggestedPrice: 800, recipeId: "recipe-rum-cola" },
  { id: "prod-vodka-soda", name: "Vodka Soda", category: "mixed_drink", suggestedPrice: 800, recipeId: "recipe-vodka-soda" },
  { id: "prod-draft-lager", name: "Draft Lager", category: "beer", suggestedPrice: 450, recipeId: "recipe-draft-lager" },
  { id: "prod-margarita", name: "Margarita", category: "mixed_drink", suggestedPrice: 900, recipeId: "recipe-margarita" },
  { id: "prod-cosmopolitan", name: "Cosmopolitan", category: "mixed_drink", suggestedPrice: 900, recipeId: "recipe-cosmopolitan" },
  { id: "prod-mojito", name: "Mojito", category: "mixed_drink", suggestedPrice: 900, recipeId: "recipe-mojito" },
  { id: "prod-screwdriver", name: "Screwdriver", category: "mixed_drink", suggestedPrice: 750, recipeId: "recipe-screwdriver" },
  { id: "prod-martini", name: "Martini", category: "mixed_drink", suggestedPrice: 950, recipeId: "recipe-martini" },
  { id: "prod-whiskey-sour", name: "Whiskey Sour", category: "mixed_drink", suggestedPrice: 850, recipeId: "recipe-whiskey-sour" },
  { id: "prod-jello-shot", name: "Jell-O Shot", category: "liquor", suggestedPrice: 500, recipeId: "recipe-jello-shot" },
  { id: "prod-burger", name: "Bar Burger", category: "food", suggestedPrice: 1200, recipeId: "recipe-burger" },
  { id: "prod-fries", name: "Loaded Fries", category: "food", suggestedPrice: 700, recipeId: "recipe-fries" },
];

export function getProduct(id: string): Product {
  const product = PRODUCT_CATALOG.find((p) => p.id === id);
  if (!product) throw new Error(`Unknown product id: ${id}`);
  return product;
}

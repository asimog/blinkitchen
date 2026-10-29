import { compareStrings } from "@/domain/order";
import { WEEK_DAYS, WEEK_MIN } from "@/domain/kitchen/types";
import type { DietPreference, KitchenProfile, KitchenState, MealSlot, PantryItem } from "@/domain/kitchen/types";
import type { Unit } from "@/domain/units";
import { findProduct, listStaples } from "@/catalog/grocery-graph";
import type { Catalog, Ingredient } from "@/catalog/types";

/**
 * Deterministic onboarding boundary: three taps (people, diet, meals of the
 * day) become the KitchenProfile, and the later "what's at home" answer
 * becomes the starting pantry. Every
 * preference the household was not asked about starts neutral and is learned
 * from what it plans, skips and cooks.
 */

export const NEUTRAL_PREFERENCE = 0.5;

export const STARTER_NAME = "Your kitchen";

/** Spices used by at least this share of recipes count as everyday masalas. */
const MASALA_RECIPE_SHARE = 0.15;

/**
 * Everyday masalas as one tap: the spices common enough across the catalog
 * that an Indian kitchen almost always has them, purchasable at `locationId`.
 */
export function everydayMasalas(catalog: Catalog, locationId: string): Ingredient[] {
  const counts = new Map<string, number>();

  for (const recipe of catalog.recipes) {
    for (const line of recipe.ingredients) {
      counts.set(line.ingredientId, (counts.get(line.ingredientId) ?? 0) + 1);
    }
  }

  return catalog.ingredients
    .filter((ingredient) => ingredient.category === "spice")
    .filter((ingredient) => (counts.get(ingredient.id) ?? 0) >= MASALA_RECIPE_SHARE * catalog.recipes.length)
    .filter((ingredient) => findProduct(catalog, ingredient.id, locationId) !== undefined)
    .sort((a, b) => compareStrings(a.id, b.id));
}

const STARTER_BUDGET = 1500;

export function starterProfile(
  memberCount: number,
  diet: DietPreference,
  mealSlots: MealSlot[],
  locationId: string,
): KitchenProfile {
  return {
    displayName: STARTER_NAME,
    memberCount,
    locationId,
    weeklyBudget: STARTER_BUDGET,
    diet,
    cuisines: [],
    cookingDaysPerWeek: WEEK_DAYS.length,
    mealSlots,
    conveniencePreference: NEUTRAL_PREFERENCE,
    priceSensitivity: NEUTRAL_PREFERENCE,
    explorationPreference: NEUTRAL_PREFERENCE,
    planningPreference: NEUTRAL_PREFERENCE,
    kitchenType: "existing",
    starterIngredientIds: [],
  };
}

/**
 * "The usual stuff": the shelf-stable staples and everyday masalas almost
 * every Indian kitchen already has. Fresh staples (onion, milk) still get
 * bought, because nobody can assume them.
 */
export function usualStaples(catalog: Catalog, locationId: string): Ingredient[] {
  const shelf = listStaples(catalog).filter(
    (ingredient) => ingredient.storageType === "shelf_stable" && findProduct(catalog, ingredient.id, locationId),
  );

  const ids = new Set(shelf.map((ingredient) => ingredient.id));

  return [...shelf, ...everydayMasalas(catalog, locationId).filter((spice) => !ids.has(spice.id))];
}

/**
 * Week 1 asks what is already at home once the meals are chosen. Until the
 * household has stock or a delivery, the question is still open.
 */
export function needsHomeCheck(kitchen: KitchenState): boolean {
  return kitchen.week === WEEK_MIN && kitchen.pantry.length === 0 && kitchen.groceryFacts.length === 0;
}

/**
 * The answer becomes the starting pantry, as if it had been there when the
 * kitchen was created. Only allowed before anything was bought or cooked.
 */
export function withStartingPantry(kitchen: KitchenState, pantry: PantryItem[]): KitchenState | null {
  if (!needsHomeCheck(kitchen) || kitchen.consumptionFacts.length > 0) return null;

  return { ...kitchen, pantry: pantry.map((item) => ({ ...item })) };
}

export type TypicalPack = {
  quantity: number;
  unit: Unit;
};

/**
 * One typical pack for an ingredient: the catalog's best available SKU at the
 * household's location. No invented multipliers; out-of-stock SKUs never win.
 */
export function typicalPack(
  catalog: Catalog,
  ingredientId: string,
  locationId: string,
): TypicalPack | undefined {
  const product = findProduct(catalog, ingredientId, locationId);

  if (!product) return undefined;

  return { quantity: product.packSize, unit: product.unit };
}

/**
 * Ingredients at home -> pantry facts: one typical pack per unique ingredient,
 * at the starting week. Order follows the input, so the same input is the same
 * output.
 */
export function startingPantryItems(
  catalog: Catalog,
  ingredientIds: readonly string[],
  locationId: string,
): PantryItem[] {
  const items: PantryItem[] = [];
  const seen = new Set<string>();

  for (const ingredientId of ingredientIds) {
    if (seen.has(ingredientId)) continue;

    seen.add(ingredientId);
    const pack = typicalPack(catalog, ingredientId, locationId);

    if (!pack) continue;
    items.push({
      ingredientId,
      quantity: pack.quantity,
      unit: pack.unit,
      useSoon: false,
      acquiredWeek: WEEK_MIN,
    });
  }

  return items;
}

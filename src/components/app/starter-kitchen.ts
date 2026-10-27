import { compareStrings } from "@/domain/order";
import { WEEK_DAYS, WEEK_MIN } from "@/domain/kitchen/types";
import type { DietPreference, KitchenProfile, PantryItem } from "@/domain/kitchen/types";
import type { Unit } from "@/domain/units";
import { findProduct, listStaples } from "@/catalog/grocery-graph";
import type { Catalog, Ingredient } from "@/catalog/types";

/**
 * Deterministic onboarding boundary: three taps (people, diet, what is at
 * home) become the existing KitchenProfile fields and pantry facts. Every
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
    conveniencePreference: NEUTRAL_PREFERENCE,
    priceSensitivity: NEUTRAL_PREFERENCE,
    explorationPreference: NEUTRAL_PREFERENCE,
    planningPreference: NEUTRAL_PREFERENCE,
    kitchenType: "existing",
    starterIngredientIds: [],
  };
}

export type QuickPickGroupId = "pantry_basics" | "fresh_basics" | "regularly_bought";

export type QuickPickGroup = {
  id: QuickPickGroupId;
  label: string;
  ingredients: Ingredient[];
};

export const REGULARLY_BOUGHT_LIMIT = 8;

/**
 * Non-staple ingredients cooked most often, ranked by recipe occurrence with a
 * name tie-break. Derived from the read-only catalog; never authored by hand.
 */
export function listRegularlyBought(catalog: Catalog, limit: number): Ingredient[] {
  const counts = new Map<string, number>();

  for (const recipe of catalog.recipes) {
    for (const line of recipe.ingredients) {
      counts.set(line.ingredientId, (counts.get(line.ingredientId) ?? 0) + 1);
    }
  }

  const ranked: Ingredient[] = [];

  for (const ingredient of catalog.ingredients) {
    if (ingredient.staple) continue;

    if (!counts.has(ingredient.id)) continue;
    ranked.push(ingredient);
  }

  ranked.sort((a, b) => {
    const difference = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);

    return difference !== 0 ? difference : compareStrings(a.name, b.name);
  });

  return ranked.slice(0, limit);
}

/** Quick common ingredients, grouped for one glance: pantry, fresh, cooked often. */
export function quickPickGroups(catalog: Catalog): QuickPickGroup[] {
  const pantryBasics: Ingredient[] = [];
  const freshBasics: Ingredient[] = [];

  for (const ingredient of listStaples(catalog)) {
    if (ingredient.storageType === "perishable") {
      freshBasics.push(ingredient);
    } else {
      pantryBasics.push(ingredient);
    }
  }

  return [
    { id: "pantry_basics", label: "Pantry basics", ingredients: pantryBasics },
    { id: "fresh_basics", label: "Fresh basics", ingredients: freshBasics },
    {
      id: "regularly_bought",
      label: "Regularly bought",
      ingredients: listRegularlyBought(catalog, REGULARLY_BOUGHT_LIMIT),
    },
  ];
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
 * Quick pick -> pantry facts: one typical pack per unique ingredient, at the
 * starting week. Order follows the picks, so the same input is the same output.
 */
export function pantryItemsFromQuickPicks(
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

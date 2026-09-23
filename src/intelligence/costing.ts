import { canonicalUnitOf, normalizeQuantity, roundQuantity } from "@/domain/units";
import type { Unit } from "@/domain/units";
import type { Catalog, Recipe } from "@/catalog/types";
import { findProduct, recipeRequirements } from "@/catalog/grocery-graph";

/**
 * Simulated cost estimation. Used by ranking (budget fit), learning evidence
 * and explanations. All prices are fictional catalog prices.
 */

/** Cheapest simulated cost per canonical unit of an ingredient, if purchasable. */
export function cheapestUnitCost(
  catalog: Catalog,
  ingredientId: string,
  locationId: string,
): number | undefined {
  const product = findProduct(catalog, ingredientId, locationId);

  if (!product) return undefined;
  const pack = normalizeQuantity(product.packSize, product.unit);

  if (pack.quantity <= 0) return undefined;

  return product.price / pack.quantity;
}

/** Simulated cost of a recipe's published quantities at catalog prices. */
function estimateRecipeCost(catalog: Catalog, recipe: Recipe, locationId: string): number {
  let total = 0;

  for (const requirement of recipeRequirements(catalog, recipe)) {
    const unitCost = cheapestUnitCost(catalog, requirement.ingredient.id, locationId);

    if (unitCost === undefined) continue;
    const amount = normalizeQuantity(requirement.quantity, requirement.unit);
    total += amount.quantity * unitCost;
  }

  return roundQuantity(total);
}

/** Simulated cost per serving, using the recipe's published servings. */
export function estimateRecipeCostPerServing(
  catalog: Catalog,
  recipe: Recipe,
  locationId: string,
): number {
  return roundQuantity(estimateRecipeCost(catalog, recipe, locationId) / recipe.servings);
}

/** Simulated unit cost for one canonical unit, defaulting to 0 when unpurchasable. */
export function unitCostOrZero(
  catalog: Catalog,
  ingredientId: string,
  unit: Unit,
  locationId: string,
): number {
  const canonical = canonicalUnitOf(unit);
  const product = findProduct(catalog, ingredientId, locationId);

  if (!product || canonicalUnitOf(product.unit) !== canonical) return 0;
  const pack = normalizeQuantity(product.packSize, product.unit);

  if (pack.quantity <= 0) return 0;

  return product.price / pack.quantity;
}

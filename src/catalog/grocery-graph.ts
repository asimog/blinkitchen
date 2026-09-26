import { canonicalUnitOf, normalizeQuantity, roundQuantity } from "@/domain/units";
import { compareStrings } from "@/domain/order";
import type { Catalog, Ingredient, Product, Recipe, RecipeRequirement, Substitution } from "@/catalog/types";

/**
 * Read-only queries over the catalog. These are the only helpers the
 * intelligence engine needs; the catalog itself is never mutated.
 */

export function ingredientById(catalog: Catalog, ingredientId: string): Ingredient | undefined {
  return catalog.ingredients.find((ingredient) => ingredient.id === ingredientId);
}

export function recipeById(catalog: Catalog, recipeId: string): Recipe | undefined {
  return catalog.recipes.find((recipe) => recipe.id === recipeId);
}

export function locationById(catalog: Catalog, locationId: string): Catalog["locations"][number] | undefined {
  return catalog.locations.find((location) => location.id === locationId);
}

/**
 * Resolve a recipe's ingredient requirements against canonical ingredients.
 * Unknown references are skipped defensively (fixture data is validated).
 */
export function recipeRequirements(catalog: Catalog, recipe: Recipe): RecipeRequirement[] {
  const requirements: RecipeRequirement[] = [];

  for (const line of recipe.ingredients) {
    const ingredient = ingredientById(catalog, line.ingredientId);

    if (!ingredient) continue;
    requirements.push({
      ingredient,
      quantity: line.quantity,
      unit: line.unit,
      optional: line.optional,
    });
  }

  return requirements;
}

const STATUS_RANK: Record<Product["inventoryStatus"], number> = {
  in_stock: 0,
  low_stock: 1,
  out_of_stock: 2,
};

/**
 * Products for an ingredient at a location, in deterministic selection order:
 * available status first, then cheapest, then sku id. Out-of-stock SKUs are
 * excluded — they can never be selected.
 */
export function resolveProductCandidates(
  catalog: Catalog,
  ingredientId: string,
  locationId: string,
): Product[] {
  return catalog.products
    .filter(
      (product) =>
        product.ingredientId === ingredientId &&
        product.locationId === locationId &&
        product.inventoryStatus !== "out_of_stock",
    )
    .sort(
      (a, b) =>
        STATUS_RANK[a.inventoryStatus] - STATUS_RANK[b.inventoryStatus] ||
        a.price - b.price ||
        compareStrings(a.skuId, b.skuId),
    );
}

/** Best available product for an ingredient at a location, if any. */
export function findProduct(
  catalog: Catalog,
  ingredientId: string,
  locationId: string,
): Product | undefined {
  return resolveProductCandidates(catalog, ingredientId, locationId)[0];
}

/** Product candidates whose pack unit matches the needed unit dimension. */
export function findProductForUnit(
  catalog: Catalog,
  ingredientId: string,
  locationId: string,
  unit: Catalog["products"][number]["unit"],
): Product | undefined {
  const target = canonicalUnitOf(unit);

  return resolveProductCandidates(catalog, ingredientId, locationId).find(
    (product) => canonicalUnitOf(product.unit) === target,
  );
}

export type PackPurchase = {
  product: Product;
  packCount: number;
  purchasedQuantity: number;
  lineCost: number;
};

/**
 * Whole-week pack reasoning for one basket line: instead of picking the
 * cheapest SKU in isolation, evaluate every in-stock pack in the required
 * dimension and choose the combination with the lowest total cost. Ties go to
 * fewer packs (less cupboard overflow), then to sku id for determinism.
 */
export function planPackPurchase(
  catalog: Catalog,
  ingredientId: string,
  locationId: string,
  unit: Product["unit"],
  missing: number,
): PackPurchase | undefined {
  if (!(missing > 0)) return undefined;

  const target = canonicalUnitOf(unit);

  const candidates = resolveProductCandidates(catalog, ingredientId, locationId).filter(
    (product) => canonicalUnitOf(product.unit) === target,
  );

  let best: PackPurchase | undefined;

  for (const product of candidates) {
    const packSize = normalizeQuantity(product.packSize, product.unit).quantity;

    if (!(packSize > 0)) continue;

    const packCount = Math.max(0, Math.ceil(missing / packSize - 1e-9));

    if (packCount === 0) continue;

    const purchase: PackPurchase = {
      product,
      packCount,
      purchasedQuantity: roundQuantity(packCount * packSize),
      lineCost: roundQuantity(packCount * product.price),
    };

    const better =
      !best ||
      purchase.lineCost < best.lineCost ||
      (purchase.lineCost === best.lineCost && purchase.packCount < best.packCount) ||
      (purchase.lineCost === best.lineCost &&
        purchase.packCount === best.packCount &&
        compareStrings(product.skuId, best.product.skuId) < 0);

    if (better) best = purchase;
  }

  return best;
}

/** Explicit substitutions offered for an ingredient (never text-inferred). */
export function substitutionsFor(catalog: Catalog, ingredientId: string): Substitution[] {
  return catalog.substitutions.filter(
    (substitution) => substitution.requestedIngredientId === ingredientId,
  );
}

/** Cuisines present in the catalog, sorted for stable UI ordering. */
export function listCuisines(catalog: Catalog): string[] {
  return [...new Set(catalog.recipes.map((recipe) => recipe.cuisine))].sort();
}

/** Ingredients marked as everyday staples, sorted by name. */
export function listStaples(catalog: Catalog): Ingredient[] {
  return catalog.ingredients
    .filter((ingredient) => ingredient.staple)
    .sort((a, b) => compareStrings(a.name, b.name));
}

/** All ingredients sorted by name, for pickers and pantry editors. */
export function listIngredients(catalog: Catalog): Ingredient[] {
  return [...catalog.ingredients].sort((a, b) => compareStrings(a.name, b.name));
}

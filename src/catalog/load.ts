import ingredientsJson from "@/data/ingredients.json";
import recipesJson from "@/data/recipes.json";
import productTemplatesJson from "@/data/product-templates.json";
import substitutionsJson from "@/data/substitutions.json";
import locationsJson from "@/data/locations.json";
import { z } from "zod";
import { dimensionOf, roundQuantity } from "@/domain/units";
import { formatIssues } from "@/domain/zod-helpers";
import {
  ingredientsFileSchema,
  locationsFileSchema,
  productTemplatesFileSchema,
  recipesFileSchema,
  substitutionsFileSchema,
} from "@/catalog/schema";
import type {
  Catalog,
  Ingredient,
  InventoryStatus,
  Location,
  Product,
  ProductTemplate,
  Recipe,
  Substitution,
} from "@/catalog/types";

/**
 * The single seam where fixture JSON becomes a Catalog.
 *
 * Today: local JSON, validated with Zod, expanded deterministically.
 * Later: normalized Blinkit/research data can replace the JSON behind this
 * same function without touching the domain or the intelligence engine.
 */

/** Deterministic 0..99 signature over a string; no randomness anywhere. */
export function signatureOf(value: string): number {
  let sum = 0;
  for (let index = 0; index < value.length; index += 1) {
    sum += value.charCodeAt(index);
  }
  return sum % 100;
}

function inventoryStatusFor(
  templateId: string,
  location: Location,
): InventoryStatus {
  const signature = signatureOf(`${templateId}:${location.id}`);
  const threshold = Math.round(location.availabilityMultiplier * 100);
  if (signature > threshold) return "out_of_stock";
  if (signature > threshold - 15) return "low_stock";
  return "in_stock";
}

/**
 * Expand product templates across locations deterministically.
 *
 * A repair step guarantees every ingredient is purchasable in every location:
 * if all SKUs for an ingredient in a location would be out of stock, the
 * cheapest one is promoted to low_stock. This keeps simulated baskets
 * fulfillable while preserving out-of-stock SKUs for selection tests.
 */
export function expandProducts(
  templates: ProductTemplate[],
  locations: Location[],
): Product[] {
  const products: Product[] = [];
  for (const template of templates) {
    for (const location of locations) {
      products.push({
        skuId: `${template.id}-${location.id}`,
        ingredientId: template.ingredientId,
        name: template.name,
        brand: template.brand,
        packSize: template.packSize,
        unit: template.unit,
        price: roundQuantity(template.basePrice * location.priceMultiplier),
        locationId: location.id,
        inventoryStatus: inventoryStatusFor(template.id, location),
        simulated: true,
      });
    }
  }

  for (const location of locations) {
    const ingredientIds = [...new Set(products.map((product) => product.ingredientId))];
    for (const ingredientId of ingredientIds) {
      const rows = products.filter(
        (product) => product.ingredientId === ingredientId && product.locationId === location.id,
      );
      if (rows.length === 0 || rows.some((product) => product.inventoryStatus !== "out_of_stock")) {
        continue;
      }
      const cheapest = [...rows].sort(
        (a, b) => a.price - b.price || a.skuId.localeCompare(b.skuId),
      )[0];
      if (cheapest) cheapest.inventoryStatus = "low_stock";
    }
  }

  return products;
}

export type RawCatalog = {
  ingredients: Ingredient[];
  recipes: Recipe[];
  productTemplates: ProductTemplate[];
  locations: Location[];
  substitutions: Substitution[];
};

function assertUnique(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Catalog integrity: duplicate ${label} ids`);
  }
}

/**
 * Build and validate a Catalog from raw collections. Throws on any referential
 * integrity problem: invalid fixture data is a programmer error, not a runtime
 * condition to recover from.
 */
export function buildCatalog(raw: RawCatalog): Catalog {
  const ingredientIds = new Set(raw.ingredients.map((ingredient) => ingredient.id));
  const recipeIds = new Set(raw.recipes.map((recipe) => recipe.id));
  const locationIds = new Set(raw.locations.map((location) => location.id));

  assertUnique([...ingredientIds], "ingredient");
  assertUnique([...recipeIds], "recipe");
  assertUnique([...locationIds], "location");
  assertUnique(
    raw.substitutions.map((substitution) => substitution.id),
    "substitution",
  );

  for (const recipe of raw.recipes) {
    for (const line of recipe.ingredients) {
      if (!ingredientIds.has(line.ingredientId)) {
        throw new Error(
          `Catalog integrity: recipe ${recipe.id} references unknown ingredient ${line.ingredientId}`,
        );
      }
    }
  }

  const products = expandProducts(raw.productTemplates, raw.locations);
  for (const product of products) {
    if (!ingredientIds.has(product.ingredientId)) {
      throw new Error(
        `Catalog integrity: product ${product.skuId} references unknown ingredient ${product.ingredientId}`,
      );
    }
    if (!locationIds.has(product.locationId)) {
      throw new Error(
        `Catalog integrity: product ${product.skuId} references unknown location ${product.locationId}`,
      );
    }
  }

  const ingredientById = new Map(raw.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  for (const substitution of raw.substitutions) {
    if (substitution.requestedIngredientId === substitution.substituteIngredientId) {
      throw new Error(`Catalog integrity: substitution ${substitution.id} substitutes itself`);
    }
    const requested = ingredientById.get(substitution.requestedIngredientId);
    const substitute = ingredientById.get(substitution.substituteIngredientId);
    if (!requested || !substitute) {
      throw new Error(
        `Catalog integrity: substitution ${substitution.id} references unknown ingredients`,
      );
    }
    const requestedDimensions = new Set(requested.commonUnits.map(dimensionOf));
    const sharedDimension = substitute.commonUnits.some((unit) =>
      requestedDimensions.has(dimensionOf(unit)),
    );
    if (!sharedDimension) {
      throw new Error(
        `Catalog integrity: substitution ${substitution.id} swaps incompatible quantities`,
      );
    }
  }

  for (const location of raw.locations) {
    for (const ingredient of raw.ingredients) {
      const purchasable = products.some(
        (product) =>
          product.locationId === location.id &&
          product.ingredientId === ingredient.id &&
          product.inventoryStatus !== "out_of_stock",
      );
      if (!purchasable) {
        throw new Error(
          `Catalog integrity: ${ingredient.id} is not purchasable in ${location.id}`,
        );
      }
    }
  }

  return {
    ingredients: raw.ingredients,
    recipes: raw.recipes,
    products,
    locations: raw.locations,
    substitutions: raw.substitutions,
  };
}

function parseFile<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `Catalog integrity: ${label} failed validation (${formatIssues(result.error)})`,
    );
  }
  return result.data;
}

let cached: Catalog | null = null;

/** Load and validate the fixture catalog once per process. */
export function loadCatalog(): Catalog {
  if (cached) return cached;
  cached = buildCatalog({
    ingredients: parseFile(ingredientsFileSchema, ingredientsJson, "ingredients"),
    recipes: parseFile(recipesFileSchema, recipesJson, "recipes"),
    productTemplates: parseFile(
      productTemplatesFileSchema,
      productTemplatesJson,
      "product templates",
    ),
    substitutions: parseFile(substitutionsFileSchema, substitutionsJson, "substitutions"),
    locations: parseFile(locationsFileSchema, locationsJson, "locations"),
  });
  return cached;
}

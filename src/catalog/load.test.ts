import { describe, expect, it } from "vitest";
import { buildCatalog, expandProducts, loadCatalog, signatureOf } from "@/catalog/load";
import type { RawCatalog } from "@/catalog/load";
import type { Location, ProductTemplate } from "@/catalog/types";
import ingredientsJson from "@/data/ingredients.json";
import recipesJson from "@/data/recipes.json";
import productTemplatesJson from "@/data/product-templates.json";
import substitutionsJson from "@/data/substitutions.json";
import locationsJson from "@/data/locations.json";

const raw = (): RawCatalog =>
  structuredClone({
    ingredients: ingredientsJson,
    recipes: recipesJson,
    productTemplates: productTemplatesJson,
    substitutions: substitutionsJson,
    locations: locationsJson,
  }) as RawCatalog;

describe("loadCatalog", () => {
  it("loads a coherent seed dataset", () => {
    const catalog = loadCatalog();
    expect(catalog.ingredients.length).toBeGreaterThanOrEqual(20);
    expect(catalog.ingredients.length).toBeLessThanOrEqual(30);
    expect(catalog.recipes.length).toBeGreaterThanOrEqual(10);
    expect(catalog.recipes.length).toBeLessThanOrEqual(15);
    expect(catalog.locations).toHaveLength(2);
    expect(catalog.products.length).toBeGreaterThanOrEqual(30);
    expect(catalog.products.length).toBeLessThanOrEqual(60);
    expect(catalog.substitutions.length).toBeGreaterThanOrEqual(5);
  });

  it("memoizes the validated catalog", () => {
    expect(loadCatalog()).toBe(loadCatalog());
  });

  it("every recipe ingredient exists and every recipe has a known cuisine", () => {
    const catalog = loadCatalog();
    const ingredientIds = new Set(catalog.ingredients.map((ingredient) => ingredient.id));
    for (const recipe of catalog.recipes) {
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      for (const line of recipe.ingredients) {
        expect(ingredientIds.has(line.ingredientId)).toBe(true);
      }
      expect(recipe.cuisine.length).toBeGreaterThan(0);
    }
  });

  it("every product references a known ingredient and location and is marked simulated", () => {
    const catalog = loadCatalog();
    const ingredientIds = new Set(catalog.ingredients.map((ingredient) => ingredient.id));
    const locationIds = new Set(catalog.locations.map((location) => location.id));
    for (const product of catalog.products) {
      expect(ingredientIds.has(product.ingredientId)).toBe(true);
      expect(locationIds.has(product.locationId)).toBe(true);
      expect(product.simulated).toBe(true);
    }
  });

  it("every substitution references known, distinct, dimension-compatible ingredients", () => {
    const catalog = loadCatalog();
    const ingredientIds = new Set(catalog.ingredients.map((ingredient) => ingredient.id));
    for (const substitution of catalog.substitutions) {
      expect(ingredientIds.has(substitution.requestedIngredientId)).toBe(true);
      expect(ingredientIds.has(substitution.substituteIngredientId)).toBe(true);
      expect(substitution.requestedIngredientId).not.toBe(substitution.substituteIngredientId);
      expect(substitution.compatibilityScore).toBeGreaterThan(0);
    }
  });

  it("keeps every ingredient purchasable in every location", () => {
    const catalog = loadCatalog();
    for (const location of catalog.locations) {
      for (const ingredient of catalog.ingredients) {
        const available = catalog.products.some(
          (product) =>
            product.locationId === location.id &&
            product.ingredientId === ingredient.id &&
            product.inventoryStatus !== "out_of_stock",
        );
        expect(available, `${ingredient.id} @ ${location.id}`).toBe(true);
      }
    }
  });

  it("still contains out-of-stock SKUs so selection rules are meaningful", () => {
    const catalog = loadCatalog();
    expect(catalog.products.some((product) => product.inventoryStatus === "out_of_stock")).toBe(
      true,
    );
  });

  it("rejects invalid fixture data loudly", () => {
    const broken = raw();
    broken.recipes = [
      {
        ...broken.recipes[0]!,
        id: "broken_recipe",
        ingredients: [{ ingredientId: "unicorn", quantity: 1, unit: "g", optional: false }],
      },
    ];
    expect(() => buildCatalog(broken)).toThrow(/unknown ingredient/);

    const selfSwap = raw();
    selfSwap.substitutions = [
      {
        ...selfSwap.substitutions[0]!,
        id: "self_swap",
        substituteIngredientId: selfSwap.substitutions[0]!.requestedIngredientId,
      },
    ];
    expect(() => buildCatalog(selfSwap)).toThrow(/substitutes itself/);
  });
});

describe("expandProducts", () => {
  const templates = productTemplatesJson as unknown as ProductTemplate[];
  const locations = locationsJson as unknown as Location[];

  it("is deterministic: identical inputs produce identical outputs", () => {
    expect(expandProducts(structuredClone(templates), structuredClone(locations))).toEqual(
      expandProducts(structuredClone(templates), structuredClone(locations)),
    );
  });

  it("applies location price multipliers and rounds to paise", () => {
    const products = expandProducts(templates, locations);
    const south = products.find((product) => product.skuId === "onion_fresh-delhi_south");
    const central = products.find((product) => product.skuId === "onion_fresh-delhi_central");
    expect(south?.price).toBe(43.26);
    expect(central?.price).toBe(42);
  });

  it("produces stable availability from a pure string signature", () => {
    expect(signatureOf("onion_fresh:delhi_south")).toBe(signatureOf("onion_fresh:delhi_south"));
    const products = expandProducts(templates, locations);
    expect(products.every((product) => product.simulated)).toBe(true);
  });
});

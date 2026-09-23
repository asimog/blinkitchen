import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { compareStrings } from "@/domain/order";
import {
  findProduct,
  findProductForUnit,
  ingredientById,
  listCuisines,
  listIngredients,
  listStaples,
  recipeById,
  recipeRequirements,
  resolveProductCandidates,
  substitutionsFor,
} from "@/catalog/grocery-graph";

const catalog = loadCatalog();

describe("recipe requirements", () => {
  it("resolves a recipe to canonical ingredients", () => {
    const recipe = recipeById(catalog, "rajma_chawal");
    expect(recipe).toBeDefined();
    const requirements = recipeRequirements(catalog, recipe!);
    expect(requirements.length).toBe(recipe!.ingredients.length);
    expect(requirements[0]?.ingredient.id).toBe("rajma");
    expect(requirements.every((requirement) => requirement.ingredient.name.length > 0)).toBe(true);
  });

  it("returns undefined for unknown ids", () => {
    expect(recipeById(catalog, "nope")).toBeUndefined();
    expect(ingredientById(catalog, "nope")).toBeUndefined();
  });
});

describe("product candidates", () => {
  it("never returns out-of-stock SKUs", () => {
    for (const ingredient of catalog.ingredients) {
      for (const location of catalog.locations) {
        const candidates = resolveProductCandidates(catalog, ingredient.id, location.id);
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.every((product) => product.inventoryStatus !== "out_of_stock")).toBe(
          true,
        );
      }
    }
  });

  it("orders deterministically: availability, then price, then sku", () => {
    const candidates = resolveProductCandidates(catalog, "rice", "delhi_south");

    const sorted = [...candidates].sort((a, b) => {
      const rank = { in_stock: 0, low_stock: 1, out_of_stock: 2 } as const;

      return (
        rank[a.inventoryStatus] - rank[b.inventoryStatus] ||
        a.price - b.price ||
        compareStrings(a.skuId, b.skuId)
      );
    });

    expect(candidates).toEqual(sorted);
  });

  it("finds a product whose pack unit matches the requirement unit", () => {
    const product = findProductForUnit(catalog, "onion", "delhi_south", "g");
    expect(product?.ingredientId).toBe("onion");
    expect(product?.unit).toBe("g");
  });

  it("findProduct mirrors the first candidate", () => {
    expect(findProduct(catalog, "paneer", "delhi_south")).toEqual(
      resolveProductCandidates(catalog, "paneer", "delhi_south")[0],
    );
  });
});

describe("substitutions and listings", () => {
  it("returns explicit substitutions for a requested ingredient only", () => {
    const substitutions = substitutionsFor(catalog, "paneer");
    expect(substitutions.map((substitution) => substitution.id)).toContain("paneer_to_tofu");
    expect(
      substitutions.every((substitution) => substitution.requestedIngredientId === "paneer"),
    ).toBe(true);
    expect(substitutionsFor(catalog, "salt")).toHaveLength(0);
  });

  it("lists cuisines and staples deterministically", () => {
    const cuisines = listCuisines(catalog);
    expect(cuisines).toEqual([...cuisines].sort());
    expect(cuisines).toContain("punjabi");
    expect(listStaples(catalog).every((ingredient) => ingredient.staple)).toBe(true);
    const names = listIngredients(catalog).map((ingredient) => ingredient.name);
    expect(names).toEqual([...names].sort((a, b) => compareStrings(a, b)));
  });
});

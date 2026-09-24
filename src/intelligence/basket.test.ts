import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { recipeById } from "@/catalog/grocery-graph";
import { buildBasket } from "@/intelligence/basket";
import type { PlannedMeal } from "@/intelligence/types";
import { makeKitchen, pantryItem } from "@/test-utils/kitchen";

const catalog = loadCatalog();

function plan(...recipeIds: string[]): PlannedMeal[] {
  return recipeIds.map((recipeId, index) => {
    const recipe = recipeById(catalog, recipeId);

    if (!recipe) throw new Error(`Unknown recipe ${recipeId}`);

    return {
      recipeId,
      recipe,
      source: "selected" as const,
      day: (["monday", "tuesday", "wednesday"] as const)[index] ?? "monday",
      slot: "dinner",
    };
  });
}

function itemFor(basket: ReturnType<typeof buildBasket>, ingredientId: string) {
  const item = basket.items.find((row) => row.ingredientId === ingredientId);

  if (!item) throw new Error(`No basket item for ${ingredientId}`);

  return item;
}

describe("pantry-aware missing quantities", () => {
  it("subtracts compatible pantry stock", () => {
    const kitchen = makeKitchen({}, {}, [pantryItem("rice", 200, "g")]);
    const basket = buildBasket(kitchen, catalog, plan("jeera_rice"));
    const rice = itemFor(basket, "rice");
    expect(rice.required).toBe(400);
    expect(rice.owned).toBe(200);
    expect(rice.missing).toBe(200);
    expect(rice.status).toBe("buy");
  });

  it("never subtracts incompatible units", () => {
    const kitchen = makeKitchen({}, {}, [pantryItem("paneer", 2, "piece")]);
    const basket = buildBasket(kitchen, catalog, plan("paneer_bhurji"));
    const paneer = itemFor(basket, "paneer");
    expect(paneer.owned).toBe(0);
    expect(paneer.missing).toBe(300);
  });

  it("fully covered items carry no cost and no purchase", () => {
    const kitchen = makeKitchen({}, {}, [
      pantryItem("rice", 400, "g"),
      pantryItem("cumin", 8, "g"),
      pantryItem("ghee", 20, "ml"),
      pantryItem("bay_leaf", 1, "g"),
      pantryItem("green_chili", 5, "g"),
      pantryItem("salt", 6, "g"),
    ]);

    const basket = buildBasket(kitchen, catalog, plan("jeera_rice"));
    expect(basket.totalCost).toBe(0);
    expect(basket.items.every((item) => item.status === "covered")).toBe(true);
    expect(basket.items.every((item) => item.lineCost === 0)).toBe(true);
    expect(basket.items.every((item) => item.product === undefined)).toBe(true);
    expect(basket.coveragePercent).toBe(100);
  });
});

describe("pack math", () => {
  it("rounds up to whole simulated packs", () => {
    const southern = makeKitchen({}, { memberCount: 4 });
    const basket = buildBasket(southern, catalog, plan("rajma_chawal"));
    const rajma = itemFor(basket, "rajma");
    expect(rajma.required).toBe(300);
    expect(rajma.product?.skuId).toBe("rajma_kashmiri-delhi_south");
    expect(rajma.packCount).toBe(1);
    expect(rajma.purchasedQuantity).toBe(500);
    expect(rajma.lineCost).toBe(113.3);
  });

  it("scales quantities with household size", () => {
    const large = makeKitchen({}, { memberCount: 8 });
    const basket = buildBasket(large, catalog, plan("rajma_chawal"));
    const rajma = itemFor(basket, "rajma");
    expect(rajma.required).toBe(600);
    expect(rajma.packCount).toBe(2);
    expect(rajma.purchasedQuantity).toBe(1000);
    expect(rajma.lineCost).toBe(226.6);
  });

  it("never selects out-of-stock SKUs", () => {
    for (const locationId of catalog.locations.map((location) => location.id)) {
      const kitchen = makeKitchen({}, { locationId, memberCount: 4 });

      const basket = buildBasket(
        kitchen,
        catalog,
        plan("rajma_chawal", "palak_paneer", "chole", "poha", "khichdi", "curd_rice"),
      );

      for (const item of basket.items) {
        expect(item.product?.inventoryStatus).not.toBe("out_of_stock");
      }
    }
  });

  it("totals equal the sum of line costs and stay consistent", () => {
    const kitchen = makeKitchen({}, {}, [pantryItem("rice", 100, "g")]);
    const basket = buildBasket(kitchen, catalog, plan("rajma_chawal", "jeera_rice"));
    expect(basket.totalCost).toBe(
      Math.round(basket.items.reduce((total, item) => total + item.lineCost, 0) * 100) / 100,
    );
    expect(basket.requiredValue).toBeGreaterThanOrEqual(basket.pantryValueAvoided);
    expect(basket.coveragePercent).toBeGreaterThan(0);
    expect(basket.coveragePercent).toBeLessThan(100);
    expect(basket.fulfillable).toBe(true);
    expect(basket.simulated).toBe(true);
  });
});

describe("accepted substitutions change the basket", () => {
  it("buys the substitute instead of the requested ingredient", () => {
    const pantry = [
      pantryItem("spinach", 500, "g"),
      pantryItem("onion", 150, "g"),
      pantryItem("tomato", 100, "g"),
      pantryItem("garlic", 15, "g"),
      pantryItem("ginger", 10, "g"),
      pantryItem("oil", 30, "ml"),
      pantryItem("cumin", 5, "g"),
      pantryItem("garam_masala", 5, "g"),
      pantryItem("salt", 8, "g"),
    ];

    const base = makeKitchen({}, {}, pantry);
    const plain = buildBasket(base, catalog, plan("palak_paneer"));
    expect(itemFor(plain, "paneer").status).toBe("buy");

    const accepted = makeKitchen(
      {
        weeklyChoices: [
          {
            week: 1,
            selectedMeals: [{ day: "monday", slot: "dinner", recipeId: "palak_paneer" }],
            skippedRecipeIds: [],
            substitutionDecisions: [{ substitutionId: "paneer_to_tofu", accepted: true }],
            completed: false,
          },
        ],
      },
      {},
      pantry,
    );

    const swapped = buildBasket(accepted, catalog, plan("palak_paneer"));
    expect(swapped.items.some((item) => item.ingredientId === "paneer")).toBe(false);
    const tofu = itemFor(swapped, "tofu");
    expect(tofu.required).toBe(300);
    expect(tofu.status).toBe("buy");
  });
});

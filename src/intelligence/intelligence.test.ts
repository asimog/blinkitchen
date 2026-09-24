import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { recipeById } from "@/catalog/grocery-graph";
import { buildBasket } from "@/intelligence/basket";
import { deriveLearning } from "@/intelligence/learning";
import { recommendReplenishments } from "@/intelligence/replenishment";
import { recommendSubstitutions } from "@/intelligence/substitutions";
import { buildWeekIntelligence } from "@/intelligence";
import type { KitchenState, WeeklyChoices } from "@/domain/kitchen/types";
import type { PlannedMeal } from "@/intelligence/types";
import { makeKitchen, pantryItem } from "@/test-utils/kitchen";

const catalog = loadCatalog();

function plan(...recipeIds: string[]): PlannedMeal[] {
  return recipeIds.map((recipeId, index) => ({
    recipeId,
    recipe: recipeById(catalog, recipeId)!,
    source: "selected" as const,
    day: (["monday", "tuesday", "wednesday"] as const)[index] ?? "monday",
    slot: "dinner",
  }));
}

function withDecisions(kitchen: KitchenState, decisions: WeeklyChoices["substitutionDecisions"]): KitchenState {
  return {
    ...kitchen,
    weeklyChoices: [
      {
        week: kitchen.week,
        selectedMeals: [],
        skippedRecipeIds: [],
        substitutionDecisions: decisions,
        completed: false,
      },
    ],
  };
}

describe("substitution suggestions", () => {
  it("are only offered for ingredients the basket is buying", () => {
    const kitchen = makeKitchen();
    const basket = buildBasket(kitchen, catalog, plan("rajma_chawal"));
    const suggestions = recommendSubstitutions(kitchen, catalog, basket, deriveLearning(kitchen, catalog));

    for (const suggestion of suggestions) {
      const item = basket.items.find(
        (row) => row.ingredientId === suggestion.substitution.requestedIngredientId,
      );

      expect(item?.status).toBe("buy");
    }

    expect(suggestions.every((row) => row.substitution.id !== "paneer_to_tofu")).toBe(true);
  });

  it("respects diet constraints for substitutes", () => {
    const vegan = makeKitchen({}, { diet: "vegan" });
    const basket = buildBasket(vegan, catalog, plan("tofu_bhurji"));
    const suggestions = recommendSubstitutions(vegan, catalog, basket, deriveLearning(vegan, catalog));
    expect(suggestions.some((row) => row.substitution.id === "tofu_to_paneer")).toBe(false);
  });

  it("grows stronger after acceptance and weaker after rejection", () => {
    const base = makeKitchen();
    const basket = buildBasket(base, catalog, plan("palak_paneer"));

    const neutral = recommendSubstitutions(base, catalog, basket, deriveLearning(base, catalog)).find(
      (row) => row.substitution.id === "paneer_to_tofu",
    );

    const acceptedKitchen = withDecisions(
      { ...base, week: 3 },
      [{ substitutionId: "paneer_to_tofu", accepted: true }],
    );

    const accepted = recommendSubstitutions(
      acceptedKitchen,
      catalog,
      basket,
      deriveLearning(acceptedKitchen, catalog),
    ).find((row) => row.substitution.id === "paneer_to_tofu");

    const rejectedKitchen = withDecisions(
      { ...base, week: 3 },
      [{ substitutionId: "paneer_to_tofu", accepted: false }],
    );

    const rejected = recommendSubstitutions(
      rejectedKitchen,
      catalog,
      basket,
      deriveLearning(rejectedKitchen, catalog),
    ).find((row) => row.substitution.id === "paneer_to_tofu");

    expect(accepted?.score).toBeGreaterThan(neutral?.score ?? 0);
    expect(rejected?.score).toBeLessThan(neutral?.score ?? 1);
    expect(accepted?.explanation.join(" ")).toContain("accepted");
    expect(rejected?.explanation.join(" ")).toContain("turned this down");
  });

  it("explains its source relationship", () => {
    const kitchen = makeKitchen();
    const basket = buildBasket(kitchen, catalog, plan("palak_paneer"));

    const suggestion = recommendSubstitutions(
      kitchen,
      catalog,
      basket,
      deriveLearning(kitchen, catalog),
    ).find((row) => row.substitution.id === "paneer_to_tofu");

    expect(suggestion).toBeDefined();
    expect(suggestion?.explanation[0]).toContain("Plant protein");
    expect(suggestion?.explanation.join(" ")).toContain("84%");
  });
});

describe("replenishment", () => {
  it("requires repeated recent consumption", () => {
    const kitchen = makeKitchen({}, { memberCount: 4 });

    const used = {
      ...kitchen,
      week: 5,
      consumptionFacts: [
        { id: "used-1-0", week: 1, ingredientId: "onion", quantity: 200, unit: "g" as const, kind: "used" as const },
      ],
      pantry: [pantryItem("onion", 50, "g")],
    };

    const basket = buildBasket(used, catalog, plan());
    expect(recommendReplenishments(used, catalog, basket)).toHaveLength(0);
  });

  it("fires when a repeatedly used ingredient runs low", () => {
    const kitchen = makeKitchen({}, { memberCount: 4 });

    const used = {
      ...kitchen,
      week: 5,
      consumptionFacts: [1, 2, 3, 4].map((week) => ({
        id: `used-${week}-0`,
        week,
        ingredientId: "onion",
        quantity: 200,
        unit: "g" as const,
        kind: "used" as const,
      })),
      pantry: [pantryItem("onion", 100, "g")],
    };

    const basket = buildBasket(used, catalog, plan());
    const suggestions = recommendReplenishments(used, catalog, basket);
    expect(suggestions).toHaveLength(1);
    const suggestion = suggestions[0];
    expect(suggestion?.ingredientId).toBe("onion");
    expect(suggestion?.remaining).toBe(100);
    expect(suggestion?.usedWeeks).toEqual([1, 2, 3, 4]);
    expect(suggestion?.explanation[0]).toBe("Used in 4 of the last 5 weeks.");
    expect(suggestion?.explanation[1]).toContain("Only 100 g left");
  });

  it("stays quiet when the pantry is well stocked", () => {
    const kitchen = makeKitchen({}, { memberCount: 4 });

    const used = {
      ...kitchen,
      week: 5,
      consumptionFacts: [1, 2, 3, 4].map((week) => ({
        id: `used-${week}-0`,
        week,
        ingredientId: "onion",
        quantity: 100,
        unit: "g" as const,
        kind: "used" as const,
      })),
      pantry: [pantryItem("onion", 2000, "g")],
    };

    const basket = buildBasket(used, catalog, plan());
    expect(recommendReplenishments(used, catalog, basket)).toHaveLength(0);
  });

  it("does not duplicate what the basket is already buying", () => {
    const kitchen = makeKitchen({}, { memberCount: 4 });

    const used = {
      ...kitchen,
      week: 5,
      consumptionFacts: [1, 2, 3, 4].map((week) => ({
        id: `used-${week}-0`,
        week,
        ingredientId: "onion",
        quantity: 200,
        unit: "g" as const,
        kind: "used" as const,
      })),
      pantry: [pantryItem("onion", 60, "g")],
    };

    const basket = buildBasket(used, catalog, plan("rajma_chawal", "poha"));
    expect(basket.items.find((item) => item.ingredientId === "onion")?.status).toBe("buy");
    expect(recommendReplenishments(used, catalog, basket)).toHaveLength(0);
  });
});

describe("buildWeekIntelligence", () => {
  it("composes a full projection from facts", () => {
    const kitchen = makeKitchen({}, {}, [
      pantryItem("spinach", 500, "g", { useSoon: true }),
      pantryItem("onion", 300, "g"),
    ]);

    const intelligence = buildWeekIntelligence(kitchen, catalog);
    expect(intelligence.week).toBe(1);
    expect(intelligence.planSource).toBe("suggested");
    expect(intelligence.plan.length).toBeGreaterThan(0);
    expect(intelligence.basket.items.length).toBeGreaterThan(0);
    expect(intelligence.recommendations.length).toBeGreaterThan(0);
    expect(intelligence.narrative.length).toBeGreaterThan(0);
    expect(intelligence.narrative.length).toBeLessThanOrEqual(6);
    expect(intelligence.useSoon.some((entry) => entry.reason === "flagged")).toBe(true);
    expect(intelligence.coverage.percent).toBeGreaterThanOrEqual(0);
    expect(intelligence.coverage.simulated).toBe(true);
  });

  it("switches the plan to explicit selections", () => {
    const kitchen = makeKitchen({
      weeklyChoices: [
        {
          week: 1,
          selectedMeals: [
            { day: "monday", slot: "dinner", recipeId: "chole" },
            { day: "tuesday", slot: "breakfast", recipeId: "poha" },
          ],
          skippedRecipeIds: [],
          substitutionDecisions: [],
          completed: false,
        },
      ],
    });

    const intelligence = buildWeekIntelligence(kitchen, catalog);
    expect(intelligence.planSource).toBe("selected");
    expect(intelligence.plan.map((meal) => meal.recipeId)).toEqual(["chole", "poha"]);
    expect(intelligence.suggestedPlan.length).toBeGreaterThanOrEqual(2);
  });

  it("builds chains from shared plan ingredients", () => {
    const kitchen = makeKitchen({
      weeklyChoices: [
        {
          week: 1,
          selectedMeals: [
            { day: "monday", slot: "dinner", recipeId: "rajma_chawal" },
            { day: "tuesday", slot: "dinner", recipeId: "chole" },
            { day: "wednesday", slot: "dinner", recipeId: "mixed_veg_sabzi" },
          ],
          skippedRecipeIds: [],
          substitutionDecisions: [],
          completed: false,
        },
      ],
    });

    const intelligence = buildWeekIntelligence(kitchen, catalog);
    expect(intelligence.chains.length).toBeGreaterThan(0);
    const onion = intelligence.chains.find((chain) => chain.ingredientId === "onion");
    expect(onion).toBeDefined();
    expect(onion?.recipeIds.length).toBe(3);
    expect(onion?.recipeNames.length).toBe(3);
  });

  it("marks stale pantry items as use-soon opportunities", () => {
    const kitchen = makeKitchen({ week: 3 }, {}, [
      pantryItem("spinach", 200, "g", { acquiredWeek: 1 }),
    ]);

    const intelligence = buildWeekIntelligence(kitchen, catalog);
    const entry = intelligence.useSoon.find((row) => row.ingredientId === "spinach");
    expect(entry?.reason).toBe("stale");
    expect(entry?.explanation).toContain("weeks");
  });

  it("never persists or mutates: identical inputs give identical projections", () => {
    const kitchen = makeKitchen({}, {}, [pantryItem("onion", 200, "g")]);
    const before = JSON.stringify(kitchen);
    const first = buildWeekIntelligence(kitchen, catalog);
    const second = buildWeekIntelligence(kitchen, catalog);
    expect(first).toEqual(second);
    expect(JSON.stringify(kitchen)).toBe(before);
  });

  it("counts rescued use-soon items against the swapped plan, not the recipe text", () => {
    const kitchen = makeKitchen(
      {
        weeklyChoices: [
          {
            week: 1,
            selectedMeals: [{ day: "monday", slot: "dinner", recipeId: "tofu_bhurji" }],
            skippedRecipeIds: [],
            substitutionDecisions: [{ substitutionId: "tofu_to_paneer", accepted: true }],
            completed: false,
          },
        ],
      },
      {},
      [pantryItem("tofu", 300, "g", { useSoon: true })],
    );

    const intelligence = buildWeekIntelligence(kitchen, catalog);
    const rescueLine = intelligence.narrative.find((line) => line.includes("use-soon"));
    // The plan cooks paneer (the accepted swap), so the flagged tofu is NOT rescued.
    expect(rescueLine).toBe("1 use-soon item is still waiting to be used.");
  });
});

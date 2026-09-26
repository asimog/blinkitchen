import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { applyKitchenCommand } from "@/domain/kitchen/commands";
import { deriveLearning } from "@/intelligence/learning";
import { rankRecipes } from "@/intelligence/meals";
import { suggestPlan } from "@/intelligence/planner";
import type { KitchenState } from "@/domain/kitchen/types";
import { makeKitchen, pantryItem } from "@/test-utils/kitchen";

const catalog = loadCatalog();

function rank(kitchen: KitchenState) {
  return rankRecipes(kitchen, catalog, deriveLearning(kitchen, catalog));
}

function planFor(kitchen: KitchenState) {
  return suggestPlan(kitchen, catalog, deriveLearning(kitchen, catalog), rank(kitchen));
}

function scoreOf(kitchen: KitchenState, recipeId: string): number {
  return rank(kitchen).find((row) => row.recipe.id === recipeId)?.score ?? Number.NEGATIVE_INFINITY;
}

function rankIndexOf(kitchen: KitchenState, recipeId: string): number {
  return rank(kitchen).findIndex((row) => row.recipe.id === recipeId);
}

describe("diet compatibility", () => {
  it("is a hard filter for vegan households", () => {
    const vegan = makeKitchen({}, { diet: "vegan" });
    const ranked = rank(vegan);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((row) => row.recipe.dietaryAttributes.includes("vegan"))).toBe(true);
    expect(ranked.some((row) => row.recipe.id === "palak_paneer")).toBe(false);
    expect(ranked.some((row) => row.recipe.id === "aloo_paratha")).toBe(false);
  });

  it("allows vegetarian recipes for vegetarian households", () => {
    const ranked = rank(makeKitchen());
    expect(ranked.some((row) => row.recipe.id === "palak_paneer")).toBe(true);
    expect(ranked.some((row) => row.recipe.id === "rajma_chawal")).toBe(true);
  });
});

describe("ranking behaviour", () => {
  it("is deterministic", () => {
    const kitchen = makeKitchen({}, {}, [pantryItem("onion", 300, "g")]);
    expect(rank(kitchen)).toEqual(rank(kitchen));
  });

  it("responds to pantry stock", () => {
    const empty = makeKitchen();

    const stocked = makeKitchen({}, {}, [
      pantryItem("rajma", 300, "g"),
      pantryItem("onion", 150, "g"),
      pantryItem("tomato", 200, "g"),
      pantryItem("garlic", 20, "g"),
      pantryItem("ginger", 15, "g"),
      pantryItem("oil", 30, "ml"),
      pantryItem("cumin", 5, "g"),
      pantryItem("garam_masala", 5, "g"),
      pantryItem("turmeric", 3, "g"),
      pantryItem("red_chili_powder", 3, "g"),
      pantryItem("coriander_powder", 5, "g"),
      pantryItem("amchur", 3, "g"),
      pantryItem("coriander", 15, "g"),
      pantryItem("salt", 8, "g"),
    ]);

    const impact = rank(stocked).find((row) => row.recipe.id === "rajma_chawal")?.impact;
    expect(impact?.coveragePercent).toBe(100);
    expect(impact?.missingIngredientIds).toEqual([]);
    expect(impact?.additionalCost).toBe(0);
    expect(scoreOf(stocked, "rajma_chawal")).toBeGreaterThan(scoreOf(empty, "rajma_chawal"));
  });

  it("rewards meals that use use-soon stock", () => {
    const plain = makeKitchen({}, {}, [pantryItem("spinach", 500, "g", { useSoon: false })]);
    const flagged = makeKitchen({}, {}, [pantryItem("spinach", 500, "g", { useSoon: true })]);
    const plainRec = rank(plain).find((row) => row.recipe.id === "palak_paneer");
    const flaggedRec = rank(flagged).find((row) => row.recipe.id === "palak_paneer");
    expect(flaggedRec?.factors.useSoonBenefit).toBeGreaterThan(plainRec?.factors.useSoonBenefit ?? 1);
    expect(flaggedRec?.explanation.some((line) => line.includes("before it goes stale"))).toBe(true);
  });

  it("strengthens cuisines the household actually cooks", () => {
    let kitchen = makeKitchen();
    const before = scoreOf(kitchen, "chole");

    for (let week = 0; week < 3; week += 1) {
      kitchen = expectOk(kitchen, {
        type: "complete_meal", recipeId: "rajma_chawal", day: "monday", slot: "dinner",
      });
      kitchen = expectOk(kitchen, { type: "complete_week" });
    }

    expect(scoreOf(kitchen, "chole")).toBeGreaterThan(before);
    expect(deriveLearning(kitchen, catalog).cuisineAffinity["punjabi"]).toBeGreaterThan(0.55);
  });

  it("penalizes skipped recommendations", () => {
    const fresh = makeKitchen();
    const top = rank(fresh)[0]?.recipe.id;

    if (top === undefined) throw new Error("expected a top recommendation");
    const skipped = expectOk(fresh, { type: "skip_recommendation", recipeId: top });
    expect(scoreOf(skipped, top)).toBeLessThan(scoreOf(fresh, top));
    expect(rankIndexOf(skipped, top)).toBeGreaterThan(rankIndexOf(fresh, top));
  });

  it("penalizes meals cooked in the last two weeks", () => {
    const fresh = makeKitchen();

    const cooked = expectOk(fresh, {
      type: "complete_meal", recipeId: "rajma_chawal", day: "monday", slot: "dinner",
    });

    expect(scoreOf(cooked, "rajma_chawal")).toBeLessThan(scoreOf(fresh, "rajma_chawal"));

    const longAgo = {
      ...fresh,
      week: 5,
      mealFacts: [{ id: "meal-1-0", week: 1, recipeId: "rajma_chawal", day: "monday" as const, slot: "dinner" as const }],
    };

    const recently = {
      ...fresh,
      week: 5,
      mealFacts: [{ id: "meal-5-0", week: 5, recipeId: "rajma_chawal", day: "monday" as const, slot: "dinner" as const }],
    };

    expect(scoreOf(longAgo, "rajma_chawal")).toBeGreaterThan(
      scoreOf(recently, "rajma_chawal"),
    );
  });

  it("explains every recommendation with concrete reasons", () => {
    const kitchen = makeKitchen({}, {}, [pantryItem("spinach", 500, "g", { useSoon: true })]);

    for (const row of rank(kitchen)) {
      expect(row.explanation.length).toBeGreaterThan(0);
      expect(row.explanation.length).toBeLessThanOrEqual(5);
      expect(row.explanation.join(" ")).not.toMatch(/\bAI\b|algorithm|model says/i);
    }
  });

  it("applies accepted swaps to a meal's impact so cards agree with the basket", () => {
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

    const plain = makeKitchen({}, {}, pantry);
    const plainImpact = rank(plain).find((row) => row.recipe.id === "palak_paneer")?.impact;
    expect(plainImpact?.missingIngredientIds).toContain("paneer");

    const swapped = makeKitchen(
      {
        weeklyChoices: [
          {
            week: 1,
            selectedMeals: [],
            skippedRecipeIds: [],
            substitutionDecisions: [{ substitutionId: "paneer_to_tofu", accepted: true }],
            completed: false,
          },
        ],
      },
      {},
      pantry,
    );

    const swappedImpact = rank(swapped).find((row) => row.recipe.id === "palak_paneer")?.impact;
    expect(swappedImpact?.missingIngredientIds).toContain("tofu");
    expect(swappedImpact?.missingIngredientIds).not.toContain("paneer");
  });
});

describe("suggested plan", () => {
  it("follows cooking days and keeps meal types realistic", () => {
    const kitchen = makeKitchen({}, { cookingDaysPerWeek: 3 });
    const plan = planFor(kitchen);
    expect(plan).toHaveLength(3);
    expect(plan.every((meal) => meal.source === "suggested")).toBe(true);
    expect(plan.every((meal) => meal.recipe.mealSlots.includes(meal.slot))).toBe(true);
    expect(plan.every((meal) => meal.explanation.length > 0)).toBe(true);
  });

  it("clamps plan size for extreme cooking days", () => {
    const none = makeKitchen({}, { cookingDaysPerWeek: 0 });
    expect(planFor(none).length).toBe(0);
    const always = makeKitchen({}, { cookingDaysPerWeek: 7 });
    expect(planFor(always).length).toBe(7);
  });
});

function expectOk(
  state: KitchenState,
  command: Parameters<typeof applyKitchenCommand>[1],
): KitchenState {
  const result = applyKitchenCommand(state, command);

  if (!result.ok) throw new Error(`Expected ok, got ${result.error.code}`);

  return result.state;
}

import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { recipeById } from "@/catalog/grocery-graph";
import { deriveLearning } from "@/intelligence/learning";
import { evaluatePlanCandidate, PLAN_WEIGHTS, planContext, suggestPlan } from "@/intelligence/planner";
import { rankRecipes } from "@/intelligence/meals";
import type { KitchenState } from "@/domain/kitchen/types";
import { makeKitchen, pantryItem } from "@/test-utils/kitchen";

const catalog = loadCatalog();

function rankedFor(kitchen: KitchenState) {
  return rankRecipes(kitchen, catalog, deriveLearning(kitchen, catalog));
}

describe("plan-level selection", () => {
  it("keeps the weight table balanced", () => {
    const total = Object.values(PLAN_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(Math.round(total * 100) / 100).toBe(1);
  });

  it("is deterministic and explains every planned meal", () => {
    const kitchen = makeKitchen({}, { cookingDaysPerWeek: 4 });
    const first = suggestPlan(kitchen, catalog, deriveLearning(kitchen, catalog), rankedFor(kitchen));
    const second = suggestPlan(kitchen, catalog, deriveLearning(kitchen, catalog), rankedFor(kitchen));
    expect(second).toEqual(first);
    expect(first).toHaveLength(4);
    expect(first.every((meal) => meal.explanation.length > 0)).toBe(true);
    expect(first.every((meal) => meal.recipe.mealSlots.includes(meal.slot))).toBe(true);
  });

  it("rewards a candidate that reuses what earlier meals already committed to buy", () => {
    const kitchen = makeKitchen({}, { cookingDaysPerWeek: 5 });
    const learning = deriveLearning(kitchen, catalog);
    const target = recipeById(catalog, "rajma_rice");

    if (!target) throw new Error("missing recipe");

    const emptyContext = planContext(kitchen, catalog, learning);
    const emptyEvaluation = evaluatePlanCandidate(emptyContext, target);

    const shared = target.ingredients[0];

    if (!shared) throw new Error("missing ingredient");

    const committed = new Map([[`${shared.ingredientId}:${shared.unit}`, shared.quantity]]);
    const committedContext = planContext(kitchen, catalog, learning, committed);
    const committedEvaluation = evaluatePlanCandidate(committedContext, target);

    expect(committedEvaluation.reuseIngredientIds).toContain(shared.ingredientId);
    expect(committedEvaluation.factors.crossMealReuse).toBeGreaterThan(
      emptyEvaluation.factors.crossMealReuse,
    );
    expect(committedEvaluation.utility).toBeGreaterThan(emptyEvaluation.utility);
  });

  it("reduces incremental cost when the pantry already holds the ingredients", () => {
    const learning = deriveLearning(makeKitchen(), catalog);
    const target = recipeById(catalog, "rajma_rice");

    if (!target) throw new Error("missing recipe");

    const stocked = makeKitchen({}, {}, [
      pantryItem("rajma", 500, "g"),
      pantryItem("rice", 500, "g"),
      pantryItem("onion", 300, "g"),
      pantryItem("tomato", 300, "g"),
    ]);

    const emptyEvaluation = evaluatePlanCandidate(planContext(makeKitchen(), catalog, learning), target);

    const stockedEvaluation = evaluatePlanCandidate(
      planContext(stocked, catalog, deriveLearning(stocked, catalog)),
      target,
    );

    expect(stockedEvaluation.incrementalCost).toBeLessThan(emptyEvaluation.incrementalCost);
    expect(stockedEvaluation.factors.pantryCoverage).toBeGreaterThan(
      emptyEvaluation.factors.pantryCoverage,
    );
  });

  it("rescues use-soon stock by valuing it in the plan", () => {
    const plain = makeKitchen({}, {}, [pantryItem("spinach", 500, "g", { useSoon: false })]);
    const flagged = makeKitchen({}, {}, [pantryItem("spinach", 500, "g", { useSoon: true })]);
    const target = recipeById(catalog, "palak_paneer");

    if (!target) throw new Error("missing recipe");

    const plainEvaluation = evaluatePlanCandidate(
      planContext(plain, catalog, deriveLearning(plain, catalog)),
      target,
    );

    const flaggedEvaluation = evaluatePlanCandidate(
      planContext(flagged, catalog, deriveLearning(flagged, catalog)),
      target,
    );

    expect(flaggedEvaluation.rescuedUseSoonIds).toContain("spinach");
    expect(flaggedEvaluation.factors.useSoonRescue).toBeGreaterThan(
      plainEvaluation.factors.useSoonRescue,
    );
  });
});

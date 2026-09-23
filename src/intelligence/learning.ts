import { recipeById } from "@/catalog/grocery-graph";
import { compareStrings } from "@/domain/order";
import type { Catalog } from "@/catalog/types";
import type { KitchenState } from "@/domain/kitchen/types";
import type { Learning } from "@/intelligence/types";
import { estimateRecipeCostPerServing } from "@/intelligence/costing";

/**
 * Derive everything the prototype "knows" about the household from recorded
 * facts. There is no stored learning state: this function is the learning
 * model, recomputed on every call.
 */

const CUISINE_BASE = 0.25;

const CUISINE_PREFERRED = 0.55;

const CUISINE_PER_MEAL = 0.06;

const CUISINE_CAP = 1;

const MAX_ROWS = 8;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function deriveLearning(kitchen: KitchenState, catalog: Catalog): Learning {
  const cuisineAffinity: Record<string, number> = {};

  for (const recipe of catalog.recipes) {
    if (cuisineAffinity[recipe.cuisine] === undefined) {
      cuisineAffinity[recipe.cuisine] = CUISINE_BASE;
    }
  }

  for (const cuisine of kitchen.profile.cuisines) {
    cuisineAffinity[cuisine] = Math.max(cuisineAffinity[cuisine] ?? CUISINE_BASE, CUISINE_PREFERRED);
  }

  const substitutionAffinity: Record<string, number> = {};

  for (const choices of kitchen.weeklyChoices) {
    for (const decision of choices.substitutionDecisions) {
      const substitution = catalog.substitutions.find((row) => row.id === decision.substitutionId);

      if (!substitution) continue;
      const key = `${substitution.requestedIngredientId}->${substitution.substituteIngredientId}`;
      substitutionAffinity[key] = (substitutionAffinity[key] ?? 0) + (decision.accepted ? 1 : -1);
    }
  }

  for (const key of Object.keys(substitutionAffinity)) {
    substitutionAffinity[key] = Math.max(-1, Math.min(1, (substitutionAffinity[key] ?? 0) / 2));
  }

  const cookedCosts: number[] = [];
  let lowComplexityMeals = 0;
  let exploreMeals = 0;
  const recipeCounts = new Map<string, number>();

  for (const fact of kitchen.mealFacts) {
    const recipe = recipeById(catalog, fact.recipeId);

    if (!recipe) continue;
    cuisineAffinity[recipe.cuisine] = Math.min(
      CUISINE_CAP,
      (cuisineAffinity[recipe.cuisine] ?? CUISINE_BASE) + CUISINE_PER_MEAL,
    );
    cookedCosts.push(
      estimateRecipeCostPerServing(catalog, recipe, kitchen.profile.locationId),
    );

    if (recipe.preparationComplexity === "low") lowComplexityMeals += 1;

    if (recipe.discoveryLevel === "explore") exploreMeals += 1;
    recipeCounts.set(fact.recipeId, (recipeCounts.get(fact.recipeId) ?? 0) + 1);
  }

  const mealCount = kitchen.mealFacts.length;

  const allCosts = catalog.recipes
    .map((recipe) => estimateRecipeCostPerServing(catalog, recipe, kitchen.profile.locationId))
    .sort((a, b) => a - b);

  const medianCost = allCosts[Math.floor(allCosts.length / 2)] ?? 0;

  const cheapShare =
    mealCount === 0
      ? undefined
      : cookedCosts.filter((cost) => cost <= medianCost).length / mealCount;

  const lowComplexityShare = mealCount === 0 ? undefined : lowComplexityMeals / mealCount;
  const exploreShare = mealCount === 0 ? undefined : exploreMeals / mealCount;

  const priceSensitivityEvidence =
    cheapShare === undefined
      ? kitchen.profile.priceSensitivity
      : clamp01(0.5 * kitchen.profile.priceSensitivity + 0.5 * cheapShare);

  const convenienceEvidence =
    lowComplexityShare === undefined
      ? kitchen.profile.conveniencePreference
      : clamp01(0.5 * kitchen.profile.conveniencePreference + 0.5 * lowComplexityShare);

  const explorationTendency =
    exploreShare === undefined
      ? kitchen.profile.explorationPreference
      : clamp01(0.5 * kitchen.profile.explorationPreference + 0.5 * exploreShare);

  const useCounts = new Map<string, number>();
  const wasteCounts = new Map<string, number>();

  for (const fact of kitchen.consumptionFacts) {
    const target = fact.kind === "used" ? useCounts : wasteCounts;
    target.set(fact.ingredientId, (target.get(fact.ingredientId) ?? 0) + 1);
  }

  const frequentIngredients = [...useCounts.entries()]
    .map(([ingredientId, uses]) => ({ ingredientId, uses }))
    .sort((a, b) => b.uses - a.uses || compareStrings(a.ingredientId, b.ingredientId))
    .slice(0, MAX_ROWS);

  const wastedIngredients = [...wasteCounts.entries()]
    .map(([ingredientId, wasteEvents]) => ({ ingredientId, wasteEvents }))
    .sort((a, b) => b.wasteEvents - a.wasteEvents || compareStrings(a.ingredientId, b.ingredientId))
    .slice(0, MAX_ROWS);

  const cookedRecipes = [...recipeCounts.entries()]
    .map(([recipeId, count]) => ({ recipeId, count }))
    .sort((a, b) => b.count - a.count || compareStrings(a.recipeId, b.recipeId))
    .slice(0, MAX_ROWS);

  return {
    cuisineAffinity,
    substitutionAffinity,
    priceSensitivityEvidence,
    convenienceEvidence,
    explorationTendency,
    frequentIngredients,
    wastedIngredients,
    cookedRecipes,
  };
}

/** Affinity for a directed substitution pair, defaulting to neutral. */
export function substitutionAffinityFor(
  learning: Learning,
  requestedIngredientId: string,
  substituteIngredientId: string,
): number {
  return (
    learning.substitutionAffinity[`${requestedIngredientId}->${substituteIngredientId}`] ?? 0
  );
}

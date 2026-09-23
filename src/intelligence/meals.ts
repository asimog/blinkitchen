import { normalizeQuantity, roundQuantity } from "@/domain/units";
import { compareStrings } from "@/domain/order";
import type { Catalog, Recipe } from "@/catalog/types";
import { recipeRequirements } from "@/catalog/grocery-graph";
import { currentChoices, pantryQuantity } from "@/domain/kitchen/state";
import type { KitchenState } from "@/domain/kitchen/types";
import type {
  Learning,
  MealFactors,
  MealImpact,
  MealRecommendation,
  PlannedMeal,
} from "@/intelligence/types";
import { unitCostOrZero } from "@/intelligence/costing";
import { effectiveRequirement } from "@/intelligence/basket";
import { recipeAllowedForDiet } from "@/intelligence/diet";
import { explainMeal } from "@/intelligence/explanations";
import { deriveUseSoon } from "@/intelligence/use-soon";
import { humanizeId } from "@/intelligence/labels";

/**
 * Deterministic meal ranking.
 *
 * Weights are centralized here and intentionally simple. Changing household
 * behaviour changes the factors, which changes the ranking — that is the
 * product thesis, and tests prove it.
 */
export const MEAL_WEIGHTS = {
  pantryFit: 0.3,
  cuisineFit: 0.2,
  ingredientReuse: 0.15,
  budgetFit: 0.15,
  convenience: 0.1,
  useSoonBenefit: 0.1,
} as const;

/** Minimum plan size so a week always has something to cook. */
const PLAN_MIN = 2;

const PLAN_MAX = 6;

const RECENT_WEEKS = 2;

const SKIP_PENALTY = 0.25;

const RECENT_COOK_PENALTY = 0.08;

const RECENT_COOK_PENALTY_CAP = 0.16;

/** Ingredients used by more than this share of recipes are too generic for "shared" copy (salt, oil). */
export const GENERIC_INGREDIENT_SHARE = 0.6;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Per-meal impact against the current pantry: coverage, missing quantities and
 * the simulated additional cost of filling the gaps for this one meal.
 *
 * Accepted substitutions are applied first, so the card always agrees with the
 * basket: if the household swapped paneer for tofu, the meal needs tofu.
 */
export function computeMealImpact(
  kitchen: KitchenState,
  catalog: Catalog,
  recipe: Recipe,
  useSoonIds: ReadonlySet<string>,
): MealImpact {
  const scale = kitchen.profile.memberCount / recipe.servings;
  const ownedIds = new Set<string>();
  const missingIds = new Set<string>();
  const useSoonUsedIds = new Set<string>();
  let ratioSum = 0;
  let requirements = 0;
  let additionalCost = 0;

  for (const requirement of recipeRequirements(catalog, recipe)) {
    const effective = effectiveRequirement(kitchen, catalog, requirement);
    const required = normalizeQuantity(effective.quantity * scale, effective.unit);
    const ownedInRequirementUnit = pantryQuantity(kitchen, effective.ingredientId, effective.unit);
    const owned = normalizeQuantity(ownedInRequirementUnit, effective.unit);

    const ratio =
      required.quantity > 0 ? Math.min(1, owned.quantity / required.quantity) : 0;

    ratioSum += ratio;
    requirements += 1;

    if (ratio > 0) {
      ownedIds.add(effective.ingredientId);
    } else {
      missingIds.add(effective.ingredientId);
    }

    const missingQuantity = Math.max(0, roundQuantity(required.quantity - owned.quantity));

    if (missingQuantity > 0) {
      additionalCost +=
        missingQuantity *
        unitCostOrZero(catalog, effective.ingredientId, required.unit, kitchen.profile.locationId);
    }

    if (useSoonIds.has(effective.ingredientId)) {
      useSoonUsedIds.add(effective.ingredientId);
    }
  }

  return {
    coveragePercent: requirements > 0 ? roundQuantity((ratioSum / requirements) * 100) : 0,
    additionalCost: roundQuantity(additionalCost),
    ownedIngredientIds: [...ownedIds].sort(compareStrings),
    missingIngredientIds: [...missingIds].sort(compareStrings),
    usesUseSoonIngredientIds: [...useSoonUsedIds].sort(compareStrings),
  };
}

function perMealAllowance(kitchen: KitchenState): number {
  return Math.max(60, kitchen.profile.weeklyBudget / 7);
}

function baseFactors(
  kitchen: KitchenState,
  recipe: Recipe,
  learning: Learning,
  impact: MealImpact,
  useSoonTotal: number,
): MealFactors {
  const planning = kitchen.profile.planningPreference;
  const affinity = learning.cuisineAffinity[recipe.cuisine] ?? 0.25;

  const cuisineFit = clamp01(
    recipe.discoveryLevel === "explore"
      ? affinity * (0.5 + learning.explorationTendency)
      : affinity * (1.05 - 0.25 * learning.explorationTendency),
  );

  const budgetFit = clamp01(1 - impact.additionalCost / perMealAllowance(kitchen));
  const prepScore = 1 - clamp01((recipe.estimatedPreparationMinutes - 15) / 45);

  const complexityMultiplier =
    recipe.preparationComplexity === "low"
      ? 1
      : recipe.preparationComplexity === "medium"
        ? 0.8
        : 0.6;

  // Convenience preference sharpens the prep-time advantage: households that
  // value convenience feel the difference between a 20 and a 40 minute meal more.
  const convenienceSharpness = 0.6 + 1.4 * learning.convenienceEvidence;

  const convenience = clamp01(
    Math.pow(prepScore, convenienceSharpness) * complexityMultiplier,
  );

  const useSoonBenefit =
    useSoonTotal === 0
      ? 0
      : clamp01(
          (impact.usesUseSoonIngredientIds.length / useSoonTotal) * (0.5 + 0.5 * planning),
        );

  return {
    pantryFit: clamp01((impact.coveragePercent / 100) * (0.6 + 0.4 * planning)),
    cuisineFit,
    ingredientReuse: 0,
    budgetFit,
    convenience,
    useSoonBenefit,
  };
}

function weightedScore(factors: MealFactors): number {
  return (
    factors.pantryFit * MEAL_WEIGHTS.pantryFit +
    factors.cuisineFit * MEAL_WEIGHTS.cuisineFit +
    factors.ingredientReuse * MEAL_WEIGHTS.ingredientReuse +
    factors.budgetFit * MEAL_WEIGHTS.budgetFit +
    factors.convenience * MEAL_WEIGHTS.convenience +
    factors.useSoonBenefit * MEAL_WEIGHTS.useSoonBenefit
  );
}

/**
 * In how many diet-allowed recipes does each ingredient appear? Used for
 * specificity-weighted reuse: sharing a rare ingredient matters more than
 * sharing salt.
 */
function ingredientUsageCounts(recipes: Recipe[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const recipe of recipes) {
    for (const ingredientId of new Set(recipe.ingredients.map((line) => line.ingredientId))) {
      counts.set(ingredientId, (counts.get(ingredientId) ?? 0) + 1);
    }
  }

  return counts;
}

function humanizedNames(ids: string[], catalog: Catalog): string[] {
  return ids.map((id) =>
    humanizeId(catalog.ingredients.find((ingredient) => ingredient.id === id)?.name ?? id),
  );
}

/** Rank every diet-compatible recipe for the current week, best first. */
export function rankRecipes(
  kitchen: KitchenState,
  catalog: Catalog,
  learning: Learning,
): MealRecommendation[] {
  const dietAllowed = catalog.recipes.filter((recipe) =>
    recipeAllowedForDiet(recipe, kitchen.profile.diet),
  );

  const useSoon = deriveUseSoon(kitchen, catalog);
  const useSoonIds = new Set(useSoon.map((entry) => entry.ingredientId));
  const usageCounts = ingredientUsageCounts(dietAllowed);
  const genericThreshold = GENERIC_INGREDIENT_SHARE * dietAllowed.length;
  const choices = currentChoices(kitchen);

  const drafts = dietAllowed.map((recipe) => {
    const impact = computeMealImpact(kitchen, catalog, recipe, useSoonIds);
    const factors = baseFactors(kitchen, recipe, learning, impact, useSoonIds.size);

    return { recipe, impact, factors, baseScore: weightedScore(factors) };
  });

  const maxReuseRaw = Math.max(
    1,
    ...drafts.map((draft) => {
      let raw = 0;

      for (const ingredientId of new Set(draft.recipe.ingredients.map((line) => line.ingredientId))) {
        raw += 1 / (usageCounts.get(ingredientId) ?? 1);
      }

      return raw;
    }),
  );

  const recommendations = drafts.map((draft) => {
    let reuseRaw = 0;
    const sharedIngredientIds: string[] = [];

    for (const ingredientId of new Set(draft.recipe.ingredients.map((line) => line.ingredientId))) {
      reuseRaw += 1 / (usageCounts.get(ingredientId) ?? 1);
      const count = usageCounts.get(ingredientId) ?? 0;

      if (count >= 2 && count < genericThreshold) {
        sharedIngredientIds.push(ingredientId);
      }
    }

    const factors: MealFactors = {
      ...draft.factors,
      ingredientReuse: reuseRaw / maxReuseRaw,
    };

    let score = weightedScore(factors);

    if (choices.skippedRecipeIds.includes(draft.recipe.id)) score -= SKIP_PENALTY;

    const recentCooks = kitchen.mealFacts.filter(
      (fact) => fact.recipeId === draft.recipe.id && fact.week >= kitchen.week - RECENT_WEEKS,
    ).length;

    score -= Math.min(RECENT_COOK_PENALTY_CAP, recentCooks * RECENT_COOK_PENALTY);

    const useSoonNames = humanizedNames(
      draft.impact.usesUseSoonIngredientIds.filter((id) => useSoonIds.has(id)),
      catalog,
    );

    const explanation = explainMeal({
      coveragePercent: draft.impact.coveragePercent,
      additionalCost: draft.impact.additionalCost,
      cuisineName: humanizeId(draft.recipe.cuisine),
      cuisineAffinity: factors.cuisineFit,
      sharedIngredientNames: humanizedNames(sharedIngredientIds.slice(0, 3), catalog),
      useSoonNames,
      minutes: draft.recipe.estimatedPreparationMinutes,
      convenienceEvidence: learning.convenienceEvidence,
    });

    return {
      recipe: draft.recipe,
      score: roundQuantity(score * 1000) / 1000,
      factors,
      impact: draft.impact,
      sharedIngredientIds,
      explanation,
    };
  });

  return recommendations.sort(
    (a, b) => b.score - a.score || compareStrings(a.recipe.id, b.recipe.id),
  );
}

/**
 * Deterministic suggested plan from the ranking: plan size follows cooking
 * days, with at most one breakfast and one snack so the week stays realistic.
 */
export function suggestPlan(ranked: MealRecommendation[], kitchen: KitchenState): PlannedMeal[] {
  const planSize = Math.min(PLAN_MAX, Math.max(PLAN_MIN, kitchen.profile.cookingDaysPerWeek));
  const plan: PlannedMeal[] = [];
  let breakfasts = 0;
  let snacks = 0;

  for (const recommendation of ranked) {
    if (plan.length >= planSize) break;

    if (recommendation.recipe.mealType === "breakfast") {
      if (breakfasts >= 1) continue;
      breakfasts += 1;
    } else if (recommendation.recipe.mealType === "snack") {
      if (snacks >= 1) continue;
      snacks += 1;
    }

    plan.push({
      recipeId: recommendation.recipe.id,
      recipe: recommendation.recipe,
      source: "suggested",
    });
  }

  return plan;
}

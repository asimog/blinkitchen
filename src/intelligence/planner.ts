import { normalizeQuantity, roundQuantity } from "@/domain/units";
import { compareStrings } from "@/domain/order";
import type { Catalog, Recipe } from "@/catalog/types";
import { recipeRequirements } from "@/catalog/grocery-graph";
import { currentChoices, pantryQuantity } from "@/domain/kitchen/state";
import { WEEK_DAYS } from "@/domain/kitchen/types";
import type { KitchenState } from "@/domain/kitchen/types";
import { effectiveRequirement } from "@/intelligence/basket";
import { unitCostOrZero } from "@/intelligence/costing";
import { explainPlannedMeal } from "@/intelligence/explanations";
import { humanizeId } from "@/intelligence/labels";
import { deriveUseSoon } from "@/intelligence/use-soon";
import type {
  Learning,
  MealRecommendation,
  PlannedMeal,
  PlanCandidateEvaluation,
  PlanFactors,
} from "@/intelligence/types";

/**
 * Plan-level intelligence: a deterministic greedy planner.
 *
 * Meals are chosen one slot at a time, evaluating each candidate against the
 * partial weekly plan — pantry coverage, incremental basket cost, actual
 * cross-meal reuse, use-soon rescue and variety — instead of taking the
 * highest-ranked meal unconditionally. There is no general optimiser here on
 * purpose: a greedy pass is enough for a prototype and stays explainable.
 *
 * Weights are centralized so the plan's trade-offs are auditable.
 */
export const PLAN_WEIGHTS = {
  pantryCoverage: 0.24,
  crossMealReuse: 0.18,
  cuisineFit: 0.14,
  convenienceFit: 0.1,
  incrementalCost: 0.11,
  useSoonRescue: 0.09,
  variety: 0.14,
} as const;

const PLAN_MAX = 7;

const RECENT_WEEKS = 2;

const RECENT_COOK_PENALTY = 0.08;

const RECENT_COOK_PENALTY_CAP = 0.16;

const SKIP_PENALTY = 0.25;

const CUISINE_REPEAT_PENALTY = 0.12;

const CUISINE_REPEAT_PENALTY_CAP = 0.24;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function perMealAllowance(kitchen: KitchenState): number {
  return Math.max(60, kitchen.profile.weeklyBudget / 7);
}

/** How many diet-allowed recipes use each ingredient (specificity proxy). */
function ingredientUsageCounts(recipes: Recipe[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const recipe of recipes) {
    for (const ingredientId of new Set(recipe.ingredients.map((line) => line.ingredientId))) {
      counts.set(ingredientId, (counts.get(ingredientId) ?? 0) + 1);
    }
  }

  return counts;
}

type ScaledRequirement = {
  ingredientId: string;
  quantity: number;
  unit: ReturnType<typeof normalizeQuantity>["unit"];
};

/**
 * Required (non-optional) recipe lines, scaled to the household and resolved
 * through this week's accepted substitutions — the same view the basket uses.
 */
function scaledRequirements(
  kitchen: KitchenState,
  catalog: Catalog,
  recipe: Recipe,
): ScaledRequirement[] {
  const scale = kitchen.profile.memberCount / recipe.servings;
  const lines: ScaledRequirement[] = [];

  for (const requirement of recipeRequirements(catalog, recipe)) {
    if (requirement.optional) continue;
    const effective = effectiveRequirement(kitchen, catalog, requirement);
    const required = normalizeQuantity(effective.quantity * scale, effective.unit);

    lines.push({
      ingredientId: effective.ingredientId,
      quantity: required.quantity,
      unit: required.unit,
    });
  }

  return lines;
}

export type PlanContext = {
  kitchen: KitchenState;
  catalog: Catalog;
  learning: Learning;
  /** Required quantities already committed by earlier meals, keyed `id:unit`. */
  committed: ReadonlyMap<string, number>;
  cuisineCounts: ReadonlyMap<string, number>;
  useSoonIds: ReadonlySet<string>;
  usageCounts: ReadonlyMap<string, number>;
  skippedRecipeIds: ReadonlySet<string>;
};

export function planContext(
  kitchen: KitchenState,
  catalog: Catalog,
  learning: Learning,
  committed: ReadonlyMap<string, number> = new Map(),
  cuisineCounts: ReadonlyMap<string, number> = new Map(),
): PlanContext {
  const useSoon = deriveUseSoon(kitchen, catalog);

  return {
    kitchen,
    catalog,
    learning,
    committed,
    cuisineCounts,
    useSoonIds: new Set(useSoon.map((entry) => entry.ingredientId)),
    usageCounts: ingredientUsageCounts(catalog.recipes),
    skippedRecipeIds: new Set(currentChoices(kitchen).skippedRecipeIds),
  };
}

const keyOf = (ingredientId: string, unit: string): string => `${ingredientId}:${unit}`;

/**
 * Evaluate one candidate meal against the partial weekly plan. Pure and
 * deterministic: identical inputs give an identical evaluation.
 */
export function evaluatePlanCandidate(
  context: PlanContext,
  recipe: Recipe,
): PlanCandidateEvaluation {
  const { kitchen, catalog, learning, committed, cuisineCounts, useSoonIds, usageCounts } = context;
  const lines = scaledRequirements(kitchen, catalog, recipe);

  let coverageSum = 0;
  let incrementalCost = 0;
  let reuseRaw = 0;
  let ownRaw = 0;
  const reuseIngredientIds: string[] = [];
  const rescuedUseSoonIds: string[] = [];

  for (const line of lines) {
    const committedQuantity = committed.get(keyOf(line.ingredientId, line.unit)) ?? 0;
    const owned = pantryQuantity(kitchen, line.ingredientId, line.unit);

    coverageSum += line.quantity > 0 ? Math.min(1, owned / line.quantity) : 0;

    const remaining = Math.max(0, line.quantity - owned - committedQuantity);

    if (remaining > 0) {
      incrementalCost +=
        remaining * unitCostOrZero(catalog, line.ingredientId, line.unit, kitchen.profile.locationId);
    }

    const specificity = 1 / (usageCounts.get(line.ingredientId) ?? 1);
    ownRaw += specificity;

    if (committedQuantity > 0) {
      reuseRaw += specificity;
      reuseIngredientIds.push(line.ingredientId);
    } else if (useSoonIds.has(line.ingredientId)) {
      rescuedUseSoonIds.push(line.ingredientId);
    }
  }

  const planning = kitchen.profile.planningPreference;
  const lineCount = Math.max(1, lines.length);
  const coveragePercent = lines.length > 0 ? (coverageSum / lineCount) * 100 : 0;
  const affinity = learning.cuisineAffinity[recipe.cuisine] ?? 0.25;

  const cuisineFit = clamp01(
    recipe.discoveryLevel === "explore"
      ? affinity * (0.5 + learning.explorationTendency)
      : affinity * (1.05 - 0.25 * learning.explorationTendency),
  );

  const prepScore = 1 - clamp01((recipe.estimatedPreparationMinutes - 15) / 45);

  const complexityMultiplier =
    recipe.preparationComplexity === "low" ? 1 : recipe.preparationComplexity === "medium" ? 0.8 : 0.6;

  const convenience = clamp01(
    Math.pow(prepScore, 0.6 + 1.4 * learning.convenienceEvidence) * complexityMultiplier,
  );

  const cuisineRepeats = cuisineCounts.get(recipe.cuisine) ?? 0;

  const factors: PlanFactors = {
    pantryCoverage: clamp01((coveragePercent / 100) * (0.6 + 0.4 * planning)),
    crossMealReuse: ownRaw > 0 ? clamp01(reuseRaw / ownRaw) : 0,
    cuisineFit,
    convenienceFit: convenience,
    incrementalCost: clamp01(1 - incrementalCost / perMealAllowance(kitchen)),
    useSoonRescue:
      useSoonIds.size === 0
        ? 0
        : clamp01((rescuedUseSoonIds.length / useSoonIds.size) * (0.5 + 0.5 * planning)),
    variety: clamp01(1 - CUISINE_REPEAT_PENALTY * cuisineRepeats * 2),
  };

  let utility =
    factors.pantryCoverage * PLAN_WEIGHTS.pantryCoverage +
    factors.crossMealReuse * PLAN_WEIGHTS.crossMealReuse +
    factors.cuisineFit * PLAN_WEIGHTS.cuisineFit +
    factors.convenienceFit * PLAN_WEIGHTS.convenienceFit +
    factors.incrementalCost * PLAN_WEIGHTS.incrementalCost +
    factors.useSoonRescue * PLAN_WEIGHTS.useSoonRescue +
    factors.variety * PLAN_WEIGHTS.variety;

  if (context.skippedRecipeIds.has(recipe.id)) utility -= SKIP_PENALTY;

  const recentCooks = kitchen.mealFacts.filter(
    (fact) => fact.recipeId === recipe.id && fact.week >= kitchen.week - RECENT_WEEKS,
  ).length;

  utility -= Math.min(RECENT_COOK_PENALTY_CAP, recentCooks * RECENT_COOK_PENALTY);
  utility -= Math.min(CUISINE_REPEAT_PENALTY_CAP, cuisineRepeats * CUISINE_REPEAT_PENALTY);

  const reuseNames = humanizedNames(reuseIngredientIds, catalog);

  const rescuedNames = humanizedNames(
    rescuedUseSoonIds.filter((id) => useSoonIds.has(id)),
    catalog,
  );

  const explanation = explainPlannedMeal({
    coveragePercent,
    reuseNames,
    rescuedNames,
    incrementalCost: roundQuantity(incrementalCost),
    cuisineName: humanizeId(recipe.cuisine),
    cuisineRepeats,
    minutes: recipe.estimatedPreparationMinutes,
    convenienceEvidence: learning.convenienceEvidence,
  });

  return {
    recipe,
    utility: roundQuantity(utility * 1000) / 1000,
    factors,
    coveragePercent: roundQuantity(coveragePercent),
    incrementalCost: roundQuantity(incrementalCost),
    reuseIngredientIds: [...new Set(reuseIngredientIds)].sort(compareStrings),
    rescuedUseSoonIds: [...new Set(rescuedUseSoonIds)].sort(compareStrings),
    cuisineRepeats,
    explanation,
  };
}

function humanizedNames(ids: string[], catalog: Catalog): string[] {
  return [...new Set(ids)]
    .map((id) => humanizeId(catalog.ingredients.find((ingredient) => ingredient.id === id)?.name ?? id))
    .sort(compareStrings);
}

function addCommitted(
  committed: Map<string, number>,
  kitchen: KitchenState,
  catalog: Catalog,
  recipe: Recipe,
): void {
  for (const line of scaledRequirements(kitchen, catalog, recipe)) {
    const key = keyOf(line.ingredientId, line.unit);
    committed.set(key, roundQuantity((committed.get(key) ?? 0) + line.quantity));
  }
}

/**
 * Deterministic suggested plan: one meal per cooking day, each chosen greedily
 * against the partial plan. Discovery households keep one exploration meal when
 * the week would otherwise contain none.
 */
export function suggestPlan(
  kitchen: KitchenState,
  catalog: Catalog,
  learning: Learning,
  ranked: MealRecommendation[],
): PlannedMeal[] {
  const planSize = Math.min(PLAN_MAX, Math.max(0, kitchen.profile.cookingDaysPerWeek));
  const plan: PlannedMeal[] = [];

  if (planSize === 0 || ranked.length === 0) return plan;

  const committed = new Map<string, number>();
  const cuisineCounts = new Map<string, number>();
  const usedRecipeIds = new Set<string>();

  for (let slotIndex = 0; slotIndex < planSize; slotIndex += 1) {
    const day = WEEK_DAYS[slotIndex];

    if (!day) break;

    const isFinalSlot = slotIndex === planSize - 1;

    const needsDiscoveryMeal =
      kitchen.profile.explorationPreference >= 0.7 &&
      isFinalSlot &&
      !plan.some((meal) => meal.recipe.discoveryLevel === "explore");

    const context = planContext(kitchen, catalog, learning, committed, cuisineCounts);

    let pool = ranked.filter((row) => !usedRecipeIds.has(row.recipe.id));

    if (needsDiscoveryMeal) {
      const discoveryPool = pool.filter((row) => row.recipe.discoveryLevel === "explore");

      if (discoveryPool.length > 0) pool = discoveryPool;
    }

    let best: { meal: PlannedMeal; utility: number } | undefined;

    for (const row of pool) {
      const evaluation = evaluatePlanCandidate(context, row.recipe);
      const slot = row.recipe.mealSlots.includes("dinner") ? "dinner" : row.recipe.mealSlots[0];

      if (!slot) continue;

      const candidate: PlannedMeal = {
        recipeId: row.recipe.id,
        recipe: row.recipe,
        source: "suggested",
        day,
        slot,
        explanation: evaluation.explanation,
      };

      const better =
        !best ||
        evaluation.utility > best.utility ||
        (evaluation.utility === best.utility &&
          compareStrings(row.recipe.id, best.meal.recipeId) < 0);

      if (better) best = { meal: candidate, utility: evaluation.utility };
    }

    if (!best) break;

    plan.push(best.meal);
    usedRecipeIds.add(best.meal.recipeId);
    cuisineCounts.set(
      best.meal.recipe.cuisine,
      (cuisineCounts.get(best.meal.recipe.cuisine) ?? 0) + 1,
    );
    addCommitted(committed, kitchen, catalog, best.meal.recipe);
  }

  return plan;
}

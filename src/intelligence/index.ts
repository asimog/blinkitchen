import { formatRupees, formatQuantity } from "@/domain/units";
import { compareStrings } from "@/domain/order";
import type { Catalog } from "@/catalog/types";
import { ingredientById, recipeById, recipeRequirements } from "@/catalog/grocery-graph";
import { currentChoices } from "@/domain/kitchen/state";
import type { KitchenState } from "@/domain/kitchen/types";
import { buildBasket, effectiveRequirement } from "@/intelligence/basket";
import { findIngredientChains } from "@/intelligence/chains";
import { humanizeId } from "@/intelligence/labels";
import { deriveLearning } from "@/intelligence/learning";
import { rankRecipes } from "@/intelligence/meals";
import { evaluatePlanCandidate, planContext, suggestPlan } from "@/intelligence/planner";
import { recommendReplenishments } from "@/intelligence/replenishment";
import { recommendSubstitutions } from "@/intelligence/substitutions";
import type {
  Basket,
  IngredientChain,
  Learning,
  PlannedMeal,
  ReplenishmentSuggestion,
  SubstitutionSuggestion,
  UseSoonOpportunity,
  WeekIntelligence,
} from "@/intelligence/types";
import { deriveUseSoon } from "@/intelligence/use-soon";
import type { UseSoonEntry } from "@/intelligence/use-soon";

export * from "@/intelligence/types";

export { deriveLearning } from "@/intelligence/learning";

export { rankRecipes } from "@/intelligence/meals";

export { recipeAllowedForDiet, ingredientAllowedForDiet } from "@/intelligence/diet";

export { buildBasket } from "@/intelligence/basket";

export { findIngredientChains } from "@/intelligence/chains";

export { recommendSubstitutions } from "@/intelligence/substitutions";

export { recommendReplenishments } from "@/intelligence/replenishment";

export { deriveUseSoon } from "@/intelligence/use-soon";

export { humanizeId } from "@/intelligence/labels";

const MAX_NARRATIVE = 6;

function toOpportunity(
  entry: UseSoonEntry,
  catalog: Catalog,
): UseSoonOpportunity | undefined {
  const ingredient = ingredientById(catalog, entry.ingredientId);

  if (!ingredient) return undefined;

  return {
    ingredientId: entry.ingredientId,
    ingredient,
    quantity: entry.quantity,
    unit: entry.unit,
    reason: entry.reason,
    explanation:
      entry.reason === "flagged"
        ? `${ingredient.name} is marked use soon.`
        : `${ingredient.name} has been in the kitchen for ${entry.ageWeeks} week${entry.ageWeeks === 1 ? "" : "s"}.`,
  };
}

function cuisineSignal(kitchen: KitchenState, catalog: Catalog): string | undefined {
  if (kitchen.mealFacts.length === 0) return undefined;
  const counts = new Map<string, number>();

  for (const fact of kitchen.mealFacts) {
    const recipe = recipeById(catalog, fact.recipeId);

    if (!recipe) continue;
    counts.set(recipe.cuisine, (counts.get(recipe.cuisine) ?? 0) + 1);
  }

  const top = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || compareStrings(a[0], b[0]),
  )[0];

  if (!top) return undefined;

  return `${humanizeId(top[0])} is your most-cooked cuisine so far (${top[1]} of ${kitchen.mealFacts.length} meals).`;
}

function substitutionSignal(
  kitchen: KitchenState,
  catalog: Catalog,
  substitutions: SubstitutionSuggestion[],
): string | undefined {
  const choices = currentChoices(kitchen);

  const latest = [...choices.substitutionDecisions].sort((a, b) =>
    compareStrings(a.substitutionId, b.substitutionId),
  ).pop();

  if (!latest) return undefined;
  const suggestion = substitutions.find((row) => row.substitution.id === latest.substitutionId);
  const substitution = catalog.substitutions.find((row) => row.id === latest.substitutionId);

  if (!substitution) return undefined;
  const requested = ingredientById(catalog, substitution.requestedIngredientId)?.name ?? substitution.requestedIngredientId;
  const substitute = ingredientById(catalog, substitution.substituteIngredientId)?.name ?? substitution.substituteIngredientId;

  if (latest.accepted) {
    return `You accepted ${requested} → ${substitute}; similar swaps will rank higher next week.`;
  }

  if (suggestion && suggestion.rejectedCount > 1) {
    return `You turned down ${requested} → ${substitute} again; similar swaps will rank lower.`;
  }

  return `You kept ${requested} instead of ${substitute} this week.`;
}

function replenishmentSignal(replenishments: ReplenishmentSuggestion[]): string | undefined {
  const top = replenishments[0];

  if (!top) return undefined;

  if (top.remaining <= 0) {
    return `${top.ingredient.name} has run out — it is a regular in this kitchen (${top.usedWeeks.length} recent weeks of use).`;
  }

  return `${top.ingredient.name} is running low — ${formatQuantity(top.remaining, top.unit)} left after ${top.usedWeeks.length} weeks of use.`;
}

function wasteSignal(
  kitchen: KitchenState,
  catalog: Catalog,
  learning: Learning,
): string | undefined {
  const top = learning.wastedIngredients[0];

  if (!top || kitchen.week < 2) return undefined;
  const name = ingredientById(catalog, top.ingredientId)?.name ?? top.ingredientId;

  return `${name} has been wasted ${top.wasteEvents} time${top.wasteEvents === 1 ? "" : "s"}; recommendations now favour using it early.`;
}

function buildNarrative(input: {
  kitchen: KitchenState;
  catalog: Catalog;
  learning: Learning;
  plan: PlannedMeal[];
  basket: Basket;
  chains: IngredientChain[];
  useSoon: UseSoonOpportunity[];
  substitutions: SubstitutionSuggestion[];
  replenishments: ReplenishmentSuggestion[];
  planSource: "selected" | "suggested";
}): string[] {
  const { kitchen, catalog, learning, plan, basket, chains, useSoon, substitutions, replenishments, planSource } =
    input;

  const bullets: string[] = [];

  if (kitchen.mealFacts.length === 0) {
    bullets.push("Week 1 is a baseline: these picks come from your stated preferences and what is already home.");
  }

  if (plan.length > 0) {
    bullets.push(
      basket.coveragePercent >= 100
        ? "Everything in this week's plan is already in your kitchen."
        : `${Math.round(basket.coveragePercent)}% of what this week's plan needs is already at home — about ${formatRupees(basket.pantryValueAvoided)} of simulated groceries avoided.`,
    );
  }

  const topChain = chains[0];

  if (topChain && topChain.recipeIds.length >= 2) {
    bullets.push(
      `${topChain.ingredient.name} is reused across ${topChain.recipeIds.length} planned meals — buy once, cook more than once.`,
    );
  }

  if (useSoon.length > 0) {
    const usedIds = new Set(
      plan.flatMap((meal) =>
        recipeRequirements(catalog, meal.recipe).map(
          (requirement) => effectiveRequirement(kitchen, catalog, requirement).ingredientId,
        ),
      ),
    );

    const usedCount = useSoon.filter((entry) => usedIds.has(entry.ingredientId)).length;
    bullets.push(
      usedCount > 0
        ? `The plan uses ${usedCount} of ${useSoon.length} use-soon items.`
        : `${useSoon.length} use-soon item${useSoon.length === 1 ? " is" : "s are"} still waiting to be used.`,
    );
  }

  const substitution = substitutionSignal(kitchen, catalog, substitutions);

  if (substitution) bullets.push(substitution);
  const cuisine = cuisineSignal(kitchen, catalog);

  if (cuisine) bullets.push(cuisine);
  const waste = wasteSignal(kitchen, catalog, learning);

  if (waste) bullets.push(waste);
  const replenishment = replenishmentSignal(replenishments);

  if (replenishment) bullets.push(replenishment);

  if (planSource === "selected") {
    bullets.push("This week's basket follows the meals you selected.");
  }

  return bullets.slice(0, MAX_NARRATIVE);
}

/**
 * The single public projection of the intelligence engine.
 *
 * KitchenState + Catalog -> WeekIntelligence. Pure, deterministic, and never
 * persisted: call it whenever the facts change.
 */
export function buildWeekIntelligence(
  kitchen: KitchenState,
  catalog: Catalog,
): WeekIntelligence {
  const learning = deriveLearning(kitchen, catalog);
  const recommendations = rankRecipes(kitchen, catalog, learning);
  const choices = currentChoices(kitchen);
  const context = planContext(kitchen, catalog, learning);

  const selectedMeals = choices.selectedMeals.flatMap((selection) => {
    const recipe = recipeById(catalog, selection.recipeId);

    if (!recipe) return [];

    return [
      {
        ...selection,
        recipe,
        explanation: evaluatePlanCandidate(context, recipe).explanation,
      },
    ];
  });

  const suggestedPlan = suggestPlan(kitchen, catalog, learning, recommendations);
  const planSource: "selected" | "suggested" = selectedMeals.length > 0 ? "selected" : "suggested";

  const plan: PlannedMeal[] =
    planSource === "selected"
      ? selectedMeals.map((meal) => ({
          ...meal,
          recipeId: meal.recipe.id,
          source: "selected" as const,
        }))
      : suggestedPlan;

  const basket = buildBasket(kitchen, catalog, plan);
  const chains = findIngredientChains(kitchen, catalog, plan);

  const useSoon = deriveUseSoon(kitchen, catalog)
    .map((entry) => toOpportunity(entry, catalog))
    .filter((entry): entry is UseSoonOpportunity => Boolean(entry));

  const substitutions = recommendSubstitutions(kitchen, catalog, basket, learning);
  const replenishments = recommendReplenishments(kitchen, catalog, basket);

  return {
    week: kitchen.week,
    learning,
    recommendations,
    plan,
    planSource,
    suggestedPlan,
    basket,
    chains,
    useSoon,
    substitutions,
    replenishments,
    coverage: {
      percent: basket.coveragePercent,
      coveredValue: basket.pantryValueAvoided,
      requiredValue: basket.requiredValue,
      simulated: true,
    },
    narrative: buildNarrative({
      kitchen,
      catalog,
      learning,
      plan,
      basket,
      chains,
      useSoon,
      substitutions,
      replenishments,
      planSource,
    }),
  };
}

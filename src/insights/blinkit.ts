import type { Catalog } from "@/catalog/types";
import { ingredientById, recipeById } from "@/catalog/grocery-graph";
import type { KitchenState } from "@/domain/kitchen/types";
import { buildWeekIntelligence } from "@/intelligence";

/** Beyond this share of recipes an ingredient is a household-level staple. */
const LENS_GENERIC_SHARE = 0.8;

/**
 * Cohort-level read model over simulated household journeys.
 *
 * Read-only by construction: it takes week snapshots, derives everything, and
 * returns a plain projection. It cannot mutate household state and is never a
 * data authority. Every figure here is simulated.
 *
 * Note on inputs: each element of `kitchens` is one household-week snapshot
 * (e.g. the eight weekly states of four journeys, 32 snapshots). Per-week
 * projections are summed across snapshots; append-only facts are deduplicated
 * by household id + fact id so history is never double counted.
 */

export type ArchetypeSummary = {
  householdId: string;
  householdName: string;
  weeksObserved: number;
  mealsCooked: number;
  basketSpend: number;
  finalCoveragePercent: number;
  acceptedSwaps: number;
  rejectedSwaps: number;
  spoilageEvents: number;
  reuseChains: number;
  avgPreparationMinutes: number;
};

export type BlinkitInsights = {
  simulated: true;
  households: number;
  weekSnapshots: number;
  missingIngredients: { ingredientId: string; name: string; weeksMissing: number; share: number }[];
  reusedIngredients: { ingredientId: string; name: string; appearances: number }[];
  useSoonFrequency: { ingredientId: string; name: string; occurrences: number }[];
  substitutionOutcomes: { substitutionId: string; label: string; accepted: number; rejected: number }[];
  replenishmentSignals: { ingredientId: string; name: string; households: number }[];
  cuisineSignals: { cuisine: string; meals: number }[];
  cumulativeBasketSpend: number;
  avoidedBasketValue: number;
  archetypes: ArchetypeSummary[];
  narrative: string[];
};

function householdIds(states: KitchenState[]): string[] {
  return [...new Set(states.map((state) => state.id))].sort();
}

function finalStateByHousehold(states: KitchenState[]): KitchenState[] {
  const byId = new Map<string, KitchenState>();
  for (const state of states) {
    const current = byId.get(state.id);
    if (!current || state.week >= current.week) byId.set(state.id, state);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function buildBlinkitInsights(
  kitchens: KitchenState[],
  catalog: Catalog,
): BlinkitInsights {
  if (kitchens.length === 0) {
    return {
      simulated: true,
      households: 0,
      weekSnapshots: 0,
      missingIngredients: [],
      reusedIngredients: [],
      useSoonFrequency: [],
      substitutionOutcomes: [],
      replenishmentSignals: [],
      cuisineSignals: [],
      cumulativeBasketSpend: 0,
      avoidedBasketValue: 0,
      archetypes: [],
      narrative: ["No simulated households were provided."],
    };
  }

  const finals = finalStateByHousehold(kitchens);
  const nameOf = (ingredientId: string) =>
    ingredientById(catalog, ingredientId)?.name ?? ingredientId;

  const missingCounts = new Map<string, number>();
  const reuseCounts = new Map<string, number>();
  const useSoonCounts = new Map<string, number>();
  const replenishmentHouseholds = new Map<string, Set<string>>();
  const spendByHousehold = new Map<string, number>();
  let cumulativeBasketSpend = 0;
  let avoidedBasketValue = 0;

  for (const state of kitchens) {
    const intelligence = buildWeekIntelligence(state, catalog);
    cumulativeBasketSpend += intelligence.basket.totalCost;
    avoidedBasketValue += intelligence.basket.pantryValueAvoided;
    spendByHousehold.set(
      state.id,
      (spendByHousehold.get(state.id) ?? 0) + intelligence.basket.totalCost,
    );
    for (const item of intelligence.basket.items) {
      if (item.status === "buy" && item.missing > 0) {
        missingCounts.set(item.ingredientId, (missingCounts.get(item.ingredientId) ?? 0) + 1);
      }
    }
    for (const chain of intelligence.chains) {
      reuseCounts.set(
        chain.ingredientId,
        (reuseCounts.get(chain.ingredientId) ?? 0) + chain.recipeIds.length,
      );
    }
    for (const entry of intelligence.useSoon) {
      useSoonCounts.set(entry.ingredientId, (useSoonCounts.get(entry.ingredientId) ?? 0) + 1);
    }
    for (const suggestion of intelligence.replenishments) {
      const households = replenishmentHouseholds.get(suggestion.ingredientId) ?? new Set<string>();
      households.add(state.id);
      replenishmentHouseholds.set(suggestion.ingredientId, households);
    }
  }

  const substitutionCounts = new Map<string, { accepted: number; rejected: number }>();
  const cuisineCounts = new Map<string, number>();
  const seenMealFacts = new Set<string>();
  const seenConsumptionFacts = new Set<string>();

  for (const state of kitchens) {
    for (const choices of state.weeklyChoices) {
      for (const decision of choices.substitutionDecisions) {
        const row = substitutionCounts.get(decision.substitutionId) ?? { accepted: 0, rejected: 0 };
        if (decision.accepted) row.accepted += 1;
        else row.rejected += 1;
        substitutionCounts.set(decision.substitutionId, row);
      }
    }
    for (const fact of state.mealFacts) {
      const key = `${state.id}:meal:${fact.id}`;
      if (seenMealFacts.has(key)) continue;
      seenMealFacts.add(key);
      const recipe = recipeById(catalog, fact.recipeId);
      if (!recipe) continue;
      cuisineCounts.set(recipe.cuisine, (cuisineCounts.get(recipe.cuisine) ?? 0) + 1);
    }
    for (const fact of state.consumptionFacts) {
      const key = `${state.id}:consumption:${fact.id}`;
      if (seenConsumptionFacts.has(key)) continue;
      seenConsumptionFacts.add(key);
    }
  }

  const archetypes: ArchetypeSummary[] = finals.map((state) => {
    const intelligence = buildWeekIntelligence(state, catalog);
    const decisions = state.weeklyChoices.flatMap((row) => row.substitutionDecisions);
    const spoilage = new Set<string>();
    for (const other of kitchens) {
      if (other.id !== state.id) continue;
      for (const fact of other.consumptionFacts) {
        if (fact.kind === "wasted") spoilage.add(fact.id);
      }
    }
    const plan = intelligence.plan;
    const avgPrep =
      plan.length === 0
        ? 0
        : plan.reduce((total, meal) => total + meal.recipe.estimatedPreparationMinutes, 0) /
          plan.length;
    return {
      householdId: state.id,
      householdName: state.profile.displayName,
      weeksObserved: state.week,
      mealsCooked: state.mealFacts.length,
      basketSpend: Math.round((spendByHousehold.get(state.id) ?? 0) * 100) / 100,
      finalCoveragePercent: intelligence.coverage.percent,
      acceptedSwaps: decisions.filter((row) => row.accepted).length,
      rejectedSwaps: decisions.filter((row) => !row.accepted).length,
      spoilageEvents: spoilage.size,
      reuseChains: intelligence.chains.length,
      avgPreparationMinutes: Math.round(avgPrep),
    };
  });

  const weekSnapshots = kitchens.length;

  const missingIngredients = [...missingCounts.entries()]
    .map(([ingredientId, weeksMissing]) => ({
      ingredientId,
      name: nameOf(ingredientId),
      weeksMissing,
      share: Math.round((weeksMissing / weekSnapshots) * 100),
    }))
    .sort((a, b) => b.weeksMissing - a.weeksMissing || a.ingredientId.localeCompare(b.ingredientId))
    .slice(0, 10);

  const reusedIngredients = [...reuseCounts.entries()]
    .filter(([ingredientId]) => {
      // Spices and fats (salt, oil, turmeric) recur in almost every plan, so
      // they win any raw reuse count trivially. The lens surfaces the fresh
      // and protein ingredients where chaining is an actual planning choice.
      const ingredient = ingredientById(catalog, ingredientId);
      if (!ingredient) return false;
      if (ingredient.category === "spice" || ingredient.category === "fat") return false;
      const recipeCount = catalog.recipes.filter((recipe) =>
        recipe.ingredients.some((line) => line.ingredientId === ingredientId),
      ).length;
      return recipeCount < LENS_GENERIC_SHARE * catalog.recipes.length;
    })
    .map(([ingredientId, appearances]) => ({ ingredientId, name: nameOf(ingredientId), appearances }))
    .sort((a, b) => b.appearances - a.appearances || a.ingredientId.localeCompare(b.ingredientId))
    .slice(0, 10);

  const useSoonFrequency = [...useSoonCounts.entries()]
    .map(([ingredientId, occurrences]) => ({ ingredientId, name: nameOf(ingredientId), occurrences }))
    .sort((a, b) => b.occurrences - a.occurrences || a.ingredientId.localeCompare(b.ingredientId))
    .slice(0, 8);

  const substitutionOutcomes = [...substitutionCounts.entries()]
    .map(([substitutionId, counts]) => {
      const substitution = catalog.substitutions.find((row) => row.id === substitutionId);
      const label = substitution
        ? `${nameOf(substitution.requestedIngredientId)} → ${nameOf(substitution.substituteIngredientId)}`
        : substitutionId;
      return { substitutionId, label, ...counts };
    })
    .sort(
      (a, b) =>
        b.accepted + b.rejected - (a.accepted + a.rejected) ||
        a.substitutionId.localeCompare(b.substitutionId),
    );

  const replenishmentSignals = [...replenishmentHouseholds.entries()]
    .map(([ingredientId, households]) => ({
      ingredientId,
      name: nameOf(ingredientId),
      households: households.size,
    }))
    .sort((a, b) => b.households - a.households || a.ingredientId.localeCompare(b.ingredientId))
    .slice(0, 8);

  const cuisineSignals = [...cuisineCounts.entries()]
    .map(([cuisine, meals]) => ({ cuisine, meals }))
    .sort((a, b) => b.meals - a.meals || a.cuisine.localeCompare(b.cuisine));

  return {
    simulated: true,
    households: householdIds(kitchens).length,
    weekSnapshots,
    missingIngredients,
    reusedIngredients,
    useSoonFrequency,
    substitutionOutcomes,
    replenishmentSignals,
    cuisineSignals,
    cumulativeBasketSpend: Math.round(cumulativeBasketSpend * 100) / 100,
    avoidedBasketValue: Math.round(avoidedBasketValue * 100) / 100,
    archetypes,
    narrative: buildNarrative({
      archetypes,
      missingIngredients,
      reusedIngredients,
      substitutionOutcomes,
      useSoonFrequency,
      avoidedBasketValue,
      weekSnapshots,
    }),
  };
}

function buildNarrative(input: {
  archetypes: ArchetypeSummary[];
  missingIngredients: BlinkitInsights["missingIngredients"];
  reusedIngredients: BlinkitInsights["reusedIngredients"];
  substitutionOutcomes: BlinkitInsights["substitutionOutcomes"];
  useSoonFrequency: BlinkitInsights["useSoonFrequency"];
  avoidedBasketValue: number;
  weekSnapshots: number;
}): string[] {
  const bullets: string[] = [];
  const topMissing = input.missingIngredients[0];
  if (topMissing) {
    bullets.push(
      `${topMissing.name} appears as missing in ${topMissing.share}% of simulated household-weeks — the most recurring gap in the cohort.`,
    );
  }
  const topReused = input.reusedIngredients[0];
  if (topReused) {
    bullets.push(
      `${topReused.name} is reused across meals more than any other ingredient (${topReused.appearances} meal appearances in shared plans).`,
    );
  }
  const accepted = input.substitutionOutcomes.filter((row) => row.accepted > 0).slice(0, 2);
  if (accepted.length > 0) {
    bullets.push(
      `Accepted swaps concentrate in ${accepted.map((row) => row.label).join(" and ")} — cost-sensitive households accept them most readily.`,
    );
  }
  const rejected = input.substitutionOutcomes.find((row) => row.rejected > 0);
  if (rejected) {
    bullets.push(
      `${rejected.label} was rejected ${rejected.rejected} time${rejected.rejected === 1 ? "" : "s"}; repeated rejections weaken the suggestion, which is exactly the learning this prototype demonstrates.`,
    );
  }
  const topUseSoon = input.useSoonFrequency[0];
  if (topUseSoon) {
    bullets.push(
      `${topUseSoon.name} reaches use-soon state most often (${topUseSoon.occurrences} of ${input.weekSnapshots} simulated weeks), making it the clearest candidate for rescue-first planning.`,
    );
  }
  bullets.push(
    `Pantry awareness avoided about ₹${Math.round(input.avoidedBasketValue)} of simulated basket demand across ${input.weekSnapshots} household-weeks — demand that existed on paper but not in the basket.`,
  );
  return bullets.slice(0, 6);
}

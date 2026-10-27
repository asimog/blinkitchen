import { compareStrings } from "@/domain/order";
import type { Catalog, Ingredient, Recipe } from "@/catalog/types";
import { recipeById } from "@/catalog/grocery-graph";
import { WEEK_DAYS } from "@/domain/kitchen/types";
import type { KitchenState, MealSelection, WeekDay } from "@/domain/kitchen/types";
import { findIngredientChains } from "@/intelligence/chains";
import { orderedPlan } from "@/intelligence/pantry-timeline";
import type { MealRecommendation, WeekIntelligence } from "@/intelligence/types";

/**
 * Between weeks, the engine proposes a few changes as one-idea stories: a
 * chain that stretches one fresh ingredient across the week, a swap for a
 * dish cooked last week, a dish from a cuisine this kitchen has not tried,
 * and a cuisine the current pantry can already cook. Each story carries the
 * selections it would add; keeping or dismissing it is an explicit choice.
 */

export type RemixMeal = { recipe: Recipe; day: WeekDay };

export type RemixStory =
  | { kind: "chain"; id: string; ingredient: Ingredient; meals: RemixMeal[] }
  | { kind: "swap"; id: string; from: Recipe; to: Recipe; day: WeekDay }
  | { kind: "new"; id: string; recipe: Recipe; day: WeekDay }
  | { kind: "pantry"; id: string; recipe: Recipe; day: WeekDay; coveragePercent: number };

const CHAIN_MIN_MEALS = 3;

/** Meals this story adds to the week when the household keeps it. */
export function storySelections(story: RemixStory): MealSelection[] {
  switch (story.kind) {
    case "chain":
      return story.meals.map((meal) => ({ day: meal.day, slot: "dinner", recipeId: meal.recipe.id }));
    case "swap":
      return [{ day: story.day, slot: "dinner", recipeId: story.to.id }];
    case "new":
    case "pantry":
      return [{ day: story.day, slot: "dinner", recipeId: story.recipe.id }];
  }
}

/** The recipe a dismissal skips, when there is one to skip. */
export function storySkippedRecipeId(story: RemixStory): string | null {
  switch (story.kind) {
    case "chain":
      return null;
    case "swap":
      return story.to.id;
    case "new":
    case "pantry":
      return story.recipe.id;
  }
}

function dinnerCapable(recipe: Recipe): boolean {
  return recipe.mealSlots.includes("dinner");
}

export function buildRemixStories(
  kitchen: KitchenState,
  catalog: Catalog,
  intelligence: WeekIntelligence,
): RemixStory[] {
  const stories: RemixStory[] = [];
  const used = new Set<string>();
  const takenDays = new Set<WeekDay>();
  const plan = orderedPlan(intelligence.suggestedPlan);
  const candidates = intelligence.recommendations.filter((row) => dinnerCapable(row.recipe));
  const cookedIds = new Set(kitchen.mealFacts.map((fact) => fact.recipeId));

  const cookedCuisines = new Set(
    kitchen.mealFacts.flatMap((fact) => recipeById(catalog, fact.recipeId)?.cuisine ?? []),
  );

  const freeDay = (fromEnd: boolean): WeekDay | undefined => {
    const days = fromEnd ? [...WEEK_DAYS].reverse() : [...WEEK_DAYS];

    return days.find((day) => !takenDays.has(day));
  };

  const take = (row: MealRecommendation | undefined): Recipe | undefined => {
    if (!row) return undefined;
    used.add(row.recipe.id);

    return row.recipe;
  };

  const chain = findIngredientChains(kitchen, catalog, plan)
    .filter((row) => !["spice", "fat", "pantry"].includes(row.ingredient.category))
    .filter((row) => row.recipeIds.length >= CHAIN_MIN_MEALS)
    .sort(
      (a, b) =>
        Number(a.ingredient.staple) - Number(b.ingredient.staple) ||
        b.recipeIds.length - a.recipeIds.length ||
        compareStrings(a.ingredientId, b.ingredientId),
    )[0];

  if (chain) {
    const meals = plan
      .filter((meal) => chain.recipeIds.includes(meal.recipeId))
      .map((meal) => ({ recipe: meal.recipe, day: meal.day }));

    for (const meal of meals) {
      used.add(meal.recipe.id);
      takenDays.add(meal.day);
    }

    stories.push({ kind: "chain", id: `chain-${chain.ingredientId}`, ingredient: chain.ingredient, meals });
  }

  const lastWeek = kitchen.mealFacts
    .filter((fact) => fact.week === kitchen.week - 1)
    .sort((a, b) => WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day));

  for (const fact of lastWeek) {
    const from = recipeById(catalog, fact.recipeId);

    if (!from) continue;

    const to = take(
      candidates.find(
        (row) =>
          !used.has(row.recipe.id) &&
          row.recipe.id !== from.id &&
          !cookedIds.has(row.recipe.id) &&
          row.recipe.cuisine === from.cuisine,
      ),
    );

    const day = takenDays.has(fact.day) ? freeDay(false) : fact.day;

    if (!to || !day) continue;
    takenDays.add(day);
    stories.push({ kind: "swap", id: `swap-${from.id}-${to.id}`, from, to, day });
    break;
  }

  const fresh = take(
    candidates.find(
      (row) =>
        !used.has(row.recipe.id) &&
        !cookedCuisines.has(row.recipe.cuisine) &&
        !kitchen.profile.cuisines.includes(row.recipe.cuisine),
    ),
  );

  const freshDay = freeDay(true);

  if (fresh && freshDay) {
    takenDays.add(freshDay);
    stories.push({ kind: "new", id: `new-${fresh.id}`, recipe: fresh, day: freshDay });
  }

  const topCuisine = Object.entries(intelligence.learning.cuisineAffinity).sort(
    (a, b) => b[1] - a[1] || compareStrings(a[0], b[0]),
  )[0]?.[0];

  const pantryRow = [...candidates]
    .filter((row) => !used.has(row.recipe.id) && row.recipe.cuisine !== topCuisine)
    .sort(
      (a, b) =>
        b.impact.coveragePercent - a.impact.coveragePercent ||
        compareStrings(a.recipe.id, b.recipe.id),
    )[0];

  const pantryDay = freeDay(false);

  if (pantryRow && pantryDay && pantryRow.impact.coveragePercent > 0) {
    take(pantryRow);
    stories.push({
      kind: "pantry",
      id: `pantry-${pantryRow.recipe.id}`,
      recipe: pantryRow.recipe,
      day: pantryDay,
      coveragePercent: Math.round(pantryRow.impact.coveragePercent),
    });
  }

  return stories;
}

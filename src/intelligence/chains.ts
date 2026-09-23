import { canonicalUnitOf, normalizeQuantity, roundQuantity } from "@/domain/units";
import { compareStrings } from "@/domain/order";
import type { Catalog } from "@/catalog/types";
import { ingredientById, recipeRequirements } from "@/catalog/grocery-graph";
import type { KitchenState } from "@/domain/kitchen/types";
import type { IngredientChain, PlannedMeal } from "@/intelligence/types";
import { explainChain } from "@/intelligence/explanations";
import { GENERIC_INGREDIENT_SHARE } from "@/intelligence/meals";

/**
 * Ingredient chaining: which ingredients does the planned week reuse across
 * multiple meals? This is the "buy once, use across three meals" projection.
 */
export function findIngredientChains(
  kitchen: KitchenState,
  catalog: Catalog,
  plan: PlannedMeal[],
): IngredientChain[] {
  type Draft = {
    ingredientId: string;
    recipeIds: Set<string>;
    recipeNames: Set<string>;
    totalRequired: number;
  };

  const drafts = new Map<string, Draft>();

  for (const meal of plan) {
    const scale = kitchen.profile.memberCount / meal.recipe.servings;

    for (const requirement of recipeRequirements(catalog, meal.recipe)) {
      const required = normalizeQuantity(requirement.quantity * scale, requirement.unit);
      const existing = drafts.get(requirement.ingredient.id);

      if (existing) {
        existing.recipeIds.add(meal.recipe.id);
        existing.recipeNames.add(meal.recipe.name);
        existing.totalRequired = roundQuantity(existing.totalRequired + required.quantity);
      } else {
        drafts.set(requirement.ingredient.id, {
          ingredientId: requirement.ingredient.id,
          recipeIds: new Set([meal.recipe.id]),
          recipeNames: new Set([meal.recipe.name]),
          totalRequired: required.quantity,
        });
      }
    }
  }

  const chains: IngredientChain[] = [];

  for (const draft of drafts.values()) {
    if (draft.recipeIds.size < 2) continue;
    const ingredient = ingredientById(catalog, draft.ingredientId);

    if (!ingredient) continue;
    const unit = canonicalUnitOf(ingredient.commonUnits[0] ?? "g");
    const named = [...draft.recipeNames].sort();
    chains.push({
      ingredientId: draft.ingredientId,
      ingredient,
      recipeIds: [...draft.recipeIds].sort(),
      recipeNames: named,
      totalRequired: draft.totalRequired,
      unit,
      explanation: explainChain(named),
    });
  }

  const genericThreshold = GENERIC_INGREDIENT_SHARE * catalog.recipes.length;
  const recipeUsage = new Map<string, number>();

  for (const recipe of catalog.recipes) {
    for (const ingredientId of new Set(recipe.ingredients.map((line) => line.ingredientId))) {
      recipeUsage.set(ingredientId, (recipeUsage.get(ingredientId) ?? 0) + 1);
    }
  }

  return chains.sort(
    (a, b) =>
      genericRank(a.ingredientId) - genericRank(b.ingredientId) ||
      b.recipeIds.length - a.recipeIds.length ||
      compareStrings(a.ingredientId, b.ingredientId),
  );

  // Ubiquitous staples (salt, oil) are real chains but make poor headlines:
  // specific ingredients like onion or tomato tell the story better.
  function genericRank(ingredientId: string): number {
    return (recipeUsage.get(ingredientId) ?? 0) > genericThreshold ? 1 : 0;
  }
}

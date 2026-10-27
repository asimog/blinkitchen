import { roundQuantity } from "@/domain/units";
import type { Catalog } from "@/catalog/types";
import { recipeRequirements } from "@/catalog/grocery-graph";
import { applyKitchenCommand } from "@/domain/kitchen/commands";
import type { KitchenCommand, KitchenError } from "@/domain/kitchen/commands";
import { pantryQuantity } from "@/domain/kitchen/state";
import type { KitchenState } from "@/domain/kitchen/types";
import { effectiveRequirement } from "@/intelligence/basket";
import type { WeekIntelligence } from "@/intelligence/types";
import { deriveUseSoon } from "@/intelligence/use-soon";

export type WeekCloseResult =
  | { ok: true; state: KitchenState; commands: KitchenCommand[] }
  | { ok: false; error: KitchenError };

/**
 * Close the week on the assumption that every assigned meal was cooked.
 *
 * The household never reports cooking: an assigned meal consumes its
 * ingredients (only what is actually in stock), use-soon stock that no meal
 * touched is recorded as spoiled, and the week completes. The simulation and
 * the interactive app both close weeks through this one projection.
 */
export function closeWeek(
  kitchen: KitchenState,
  catalog: Catalog,
  intelligence: WeekIntelligence,
): WeekCloseResult {
  const commands: KitchenCommand[] = [];
  let state = kitchen;
  let failure: KitchenError | null = null;

  const push = (command: KitchenCommand): void => {
    if (failure) return;
    const result = applyKitchenCommand(state, command);

    if (!result.ok) {
      failure = result.error;

      return;
    }

    commands.push(command);
    state = result.state;
  };

  if (intelligence.planSource === "suggested" && intelligence.plan.length > 0) {
    push({
      type: "select_meals",
      meals: intelligence.plan.map(({ day, slot, recipeId }) => ({ day, slot, recipeId })),
    });
  }

  const usedIngredientIds = new Set<string>();

  for (const meal of intelligence.plan) {
    const cooked = state.mealFacts.some(
      (fact) => fact.week === state.week && fact.day === meal.day && fact.slot === meal.slot,
    );

    if (cooked) continue;
    const scale = state.profile.memberCount / meal.recipe.servings;

    for (const requirement of recipeRequirements(catalog, meal.recipe)) {
      if (requirement.optional) continue;
      const effective = effectiveRequirement(state, catalog, requirement);
      usedIngredientIds.add(effective.ingredientId);
      const inStock = pantryQuantity(state, effective.ingredientId, effective.unit);
      const quantity = roundQuantity(Math.min(effective.quantity * scale, inStock));

      if (quantity > 0) {
        push({
          type: "consume_ingredient",
          ingredientId: effective.ingredientId,
          quantity,
          unit: effective.unit,
        });
      }
    }

    push({ type: "complete_meal", recipeId: meal.recipeId, day: meal.day, slot: meal.slot });
  }

  for (const entry of deriveUseSoon(state, catalog)) {
    if (usedIngredientIds.has(entry.ingredientId)) continue;
    push({
      type: "waste_ingredient",
      ingredientId: entry.ingredientId,
      quantity: entry.quantity,
      unit: entry.unit,
    });
  }

  push({ type: "complete_week" });

  if (failure) return { ok: false, error: failure };

  return { ok: true, state, commands };
}

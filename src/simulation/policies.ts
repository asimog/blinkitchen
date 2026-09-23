import { roundQuantity } from "@/domain/units";
import type { Catalog } from "@/catalog/types";
import { recipeRequirements } from "@/catalog/grocery-graph";
import { applyKitchenCommand } from "@/domain/kitchen/commands";
import type { KitchenCommand } from "@/domain/kitchen/commands";
import type { KitchenState } from "@/domain/kitchen/types";
import { buildWeekIntelligence } from "@/intelligence";
import { effectiveRequirement } from "@/intelligence/basket";
import { deriveUseSoon } from "@/intelligence/use-soon";
import type { WeekIntelligence } from "@/intelligence/types";

/**
 * A journey policy turns one week of derived intelligence into explicit domain
 * commands. It is pure and identical for all four archetypes — the differences
 * come entirely from the fixture inputs.
 */
export type JourneyPolicy = (
  kitchen: KitchenState,
  catalog: Catalog,
  intelligence: WeekIntelligence,
) => KitchenCommand[];

/**
 * How readily this household accepts a swap: cost-sensitive households accept
 * more willingly. Derived from the profile, not from the archetype id.
 */
export function substitutionAcceptanceThreshold(kitchen: KitchenState): number {
  return roundQuantity(0.9 - 0.5 * kitchen.profile.priceSensitivity);
}

const REJECT_MARGIN = 0;

/**
 * The demo policy: cook the engine's suggested plan, accept the swaps this
 * household would accept, buy the resulting pantry-aware basket, cook it,
 * waste whatever spoiled, then close the week.
 *
 * The policy projects its own decisions through the same pure domain and the
 * same intelligence engine, so what it buys, cooks and consumes always agrees
 * with what the UI would show for those choices.
 */
export const householdPolicy: JourneyPolicy = (kitchen, catalog, intelligence) => {
  const commands: KitchenCommand[] = [];
  let projected = kitchen;

  const push = (command: KitchenCommand): void => {
    const result = applyKitchenCommand(projected, command);
    if (!result.ok) {
      throw new Error(
        `Simulation policy produced an invalid command (${result.error.code}): ${result.error.message}`,
      );
    }
    commands.push(command);
    projected = result.state;
  };

  if (intelligence.plan.length > 0) {
    push({
      type: "select_meals",
      recipeIds: intelligence.plan.map((meal) => meal.recipeId),
    });
  }

  const threshold = substitutionAcceptanceThreshold(kitchen);
  for (const suggestion of intelligence.substitutions) {
    if (suggestion.score >= threshold) {
      push({
        type: "decide_substitution",
        substitutionId: suggestion.substitution.id,
        accepted: true,
      });
    } else if (suggestion.score <= threshold - REJECT_MARGIN) {
      push({
        type: "decide_substitution",
        substitutionId: suggestion.substitution.id,
        accepted: false,
      });
    }
  }

  const decided = buildWeekIntelligence(projected, catalog);
  const lines = decided.basket.items
    .filter((item) => item.status === "buy" && item.purchasedQuantity > 0)
    .map((item) => ({
      ingredientId: item.ingredientId,
      quantity: item.purchasedQuantity,
      unit: item.unit,
    }));
  if (lines.length > 0) {
    push({ type: "receive_grocery", lines });
  }

  const usedIngredientIds = new Set<string>();
  for (const meal of decided.plan) {
    const scale = kitchen.profile.memberCount / meal.recipe.servings;
    for (const requirement of recipeRequirements(catalog, meal.recipe)) {
      const effective = effectiveRequirement(projected, catalog, requirement);
      usedIngredientIds.add(effective.ingredientId);
      const quantity = roundQuantity(effective.quantity * scale);
      if (quantity > 0) {
        push({
          type: "consume_ingredient",
          ingredientId: effective.ingredientId,
          quantity,
          unit: effective.unit,
        });
      }
    }
    push({ type: "complete_meal", recipeId: meal.recipeId });
  }

  for (const entry of deriveUseSoon(projected, catalog)) {
    if (usedIngredientIds.has(entry.ingredientId)) continue;
    push({
      type: "waste_ingredient",
      ingredientId: entry.ingredientId,
      quantity: entry.quantity,
      unit: entry.unit,
    });
  }

  push({ type: "complete_week" });
  return commands;
};

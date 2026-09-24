import { normalizeQuantity, roundQuantity, unitsCompatible } from "@/domain/units";
import type { Unit } from "@/domain/units";
import { WEEK_MAX, WEEK_MIN } from "@/domain/kitchen/types";
import type { KitchenProfile, KitchenState, PantryItem, WeeklyChoices } from "@/domain/kitchen/types";

export type CreateKitchenInput = {
  id: string;
  profile: KitchenProfile;
  pantry?: PantryItem[];
  createdAt?: string;
};

/** Create the initial kitchen state for Week 1. Pure; ids/time come from the caller. */
export function createKitchenState(input: CreateKitchenInput): KitchenState {
  const state: KitchenState = {
    id: input.id,
    profile: input.profile,
    week: WEEK_MIN,
    pantry: input.pantry ? input.pantry.map((item) => ({ ...item })) : [],
    groceryFacts: [],
    consumptionFacts: [],
    mealFacts: [],
    weeklyChoices: [],
  };

  if (input.createdAt !== undefined) {
    state.createdAt = input.createdAt;
  }

  return state;
}

/** Empty choices for a week; not inserted into state until a command needs it. */
function emptyWeeklyChoices(week: number): WeeklyChoices {
  return {
    week,
    selectedMeals: [],
    skippedRecipeIds: [],
    substitutionDecisions: [],
    completed: false,
  };
}

/** The current week's explicit choices (existing row, or an empty default). */
export function choicesForWeek(state: KitchenState, week: number): WeeklyChoices {
  return state.weeklyChoices.find((choices) => choices.week === week) ?? emptyWeeklyChoices(week);
}

export function currentChoices(state: KitchenState): WeeklyChoices {
  return choicesForWeek(state, state.week);
}

/** True once Week 8 has been completed: the journey is terminal. */
export function isJourneyComplete(state: KitchenState): boolean {
  return state.week === WEEK_MAX && choicesForWeek(state, WEEK_MAX).completed;
}

/**
 * Total pantry stock for an ingredient, in the requested unit when compatible.
 *
 * Canonical results are rounded to 2 decimals; non-canonical units (kg, l) are
 * returned unrounded because rounding them would quantize stock to 10 g / 10 ml
 * of precision for no benefit.
 */
export function pantryQuantity(state: KitchenState, ingredientId: string, unit: Unit): number {
  let total = 0;

  for (const item of state.pantry) {
    if (item.ingredientId !== ingredientId) continue;

    if (!unitsCompatible(item.unit, unit)) continue;
    const normalized = normalizeQuantity(item.quantity, item.unit);
    total += normalized.quantity;
  }

  if (unit === "kg" || unit === "l") {
    return total / 1000;
  }

  return roundQuantity(total);
}

/** Pantry rows for an ingredient whose unit is compatible with `unit`, in use order. */
export function pantryRowsFor(
  pantry: PantryItem[],
  ingredientId: string,
  unit: Unit,
): { item: PantryItem; index: number }[] {
  return pantry
    .flatMap((item, index) =>
      item.ingredientId === ingredientId && unitsCompatible(item.unit, unit)
        ? [{ item, index }]
        : [],
    )
    .sort((a, b) => {
      if (a.item.useSoon !== b.item.useSoon) return a.item.useSoon ? -1 : 1;

      if (a.item.acquiredWeek !== b.item.acquiredWeek) {
        return a.item.acquiredWeek - b.item.acquiredWeek;
      }

      return a.index - b.index;
    });
}

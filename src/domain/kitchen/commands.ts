import {
  canonicalUnitOf,
  convertQuantity,
  isUnit,
  normalizeQuantity,
  roundQuantity,
} from "@/domain/units";
import type { Unit } from "@/domain/units";
import { MAX_WEEKLY_MEALS, WEEK_MAX } from "@/domain/kitchen/types";
import type { KitchenState, PantryItem, WeeklyChoices } from "@/domain/kitchen/types";
import { choicesForWeek, isJourneyComplete, pantryRowsFor } from "@/domain/kitchen/state";

/**
 * Typed domain errors. Callers switch on `code`, never on message text.
 */
export type KitchenErrorCode =
  | "journey_complete"
  | "week_already_completed"
  | "invalid_command"
  | "invalid_quantity"
  | "unit_mismatch"
  | "insufficient_stock"
  | "duplicate_selection"
  | "too_many_meals"
  | "meal_already_completed";

export type KitchenError = { code: KitchenErrorCode; message: string };

export type CommandResult = { ok: true; state: KitchenState } | { ok: false; error: KitchenError };

export type GroceryLine = { ingredientId: string; quantity: number; unit: Unit };

export type KitchenCommand =
  | { type: "receive_grocery"; lines: GroceryLine[] }
  | { type: "consume_ingredient"; ingredientId: string; quantity: number; unit: Unit }
  | { type: "waste_ingredient"; ingredientId: string; quantity: number; unit: Unit }
  | { type: "select_meals"; recipeIds: string[] }
  | { type: "skip_recommendation"; recipeId: string }
  | { type: "decide_substitution"; substitutionId: string; accepted: boolean }
  | { type: "complete_meal"; recipeId: string }
  | { type: "complete_week" };

function fail(code: KitchenErrorCode, message: string): CommandResult {
  return { ok: false, error: { code, message } };
}

function withChoices(state: KitchenState, choices: WeeklyChoices): KitchenState {
  const others = state.weeklyChoices.filter((row) => row.week !== choices.week);
  return { ...state, weeklyChoices: [...others, choices].sort((a, b) => a.week - b.week) };
}

function validateQuantity(quantity: number, unit: Unit): KitchenError | null {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { code: "invalid_quantity", message: "Quantity must be a positive finite number" };
  }
  if (!isUnit(unit)) {
    return { code: "invalid_command", message: `Unsupported unit: ${String(unit)}` };
  }
  return null;
}

/** Merge received stock into the pantry, combining compatible units. */
function addToPantry(
  pantry: PantryItem[],
  ingredientId: string,
  quantity: number,
  unit: Unit,
  week: number,
): PantryItem[] {
  const received = normalizeQuantity(quantity, unit);
  const existingIndex = pantry.findIndex(
    (item) => item.ingredientId === ingredientId && canonicalUnitOf(item.unit) === received.unit,
  );
  if (existingIndex === -1) {
    return [
      ...pantry,
      {
        ingredientId,
        quantity: convertQuantity(received.quantity, received.unit, unit) ?? received.quantity,
        unit,
        useSoon: false,
        acquiredWeek: week,
      },
    ];
  }
  const existing = pantry[existingIndex] as PantryItem;
  const existingCanonical = normalizeQuantity(existing.quantity, existing.unit);
  const merged = roundQuantity(existingCanonical.quantity + received.quantity);
  const mergedInExistingUnit = convertQuantity(merged, existingCanonical.unit, existing.unit);
  return pantry.map((item, index) =>
    index === existingIndex
      ? { ...item, quantity: mergedInExistingUnit ?? merged, acquiredWeek: week }
      : item,
  );
}

/**
 * Remove quantity from pantry stock (use-soon rows first, then oldest).
 * Caller must have verified sufficient compatible stock.
 */
function drainPantry(
  pantry: PantryItem[],
  ingredientId: string,
  quantity: number,
  unit: Unit,
): PantryItem[] {
  const requested = normalizeQuantity(quantity, unit);
  let remaining = requested.quantity;
  const drained = pantry.map((item) => ({ ...item }));
  for (const { index } of pantryRowsFor(pantry, ingredientId, unit)) {
    if (remaining <= 0) break;
    const row = drained[index];
    if (!row) continue;
    const rowCanonical = normalizeQuantity(row.quantity, row.unit);
    const take = Math.min(rowCanonical.quantity, remaining);
    remaining = roundQuantity(remaining - take);
    const leftCanonical = roundQuantity(rowCanonical.quantity - take);
    if (leftCanonical <= 0) {
      drained[index] = { ...row, quantity: 0 };
    } else {
      const leftInRowUnit = convertQuantity(leftCanonical, rowCanonical.unit, row.unit);
      drained[index] = { ...row, quantity: leftInRowUnit ?? leftCanonical };
    }
  }
  return drained.filter((item) => item.quantity > 0);
}

function applyConsumption(
  state: KitchenState,
  command: { ingredientId: string; quantity: number; unit: Unit },
  kind: "used" | "wasted",
): CommandResult {
  const invalid = validateQuantity(command.quantity, command.unit);
  if (invalid) return { ok: false, error: invalid };
  if (!command.ingredientId) {
    return fail("invalid_command", "An ingredient id is required");
  }

  const rows = pantryRowsFor(state.pantry, command.ingredientId, command.unit);
  if (rows.length === 0) {
    const hasAnyStock = state.pantry.some((item) => item.ingredientId === command.ingredientId);
    if (hasAnyStock) {
      return fail(
        "unit_mismatch",
        `Pantry stock for ${command.ingredientId} is not measured in a compatible unit`,
      );
    }
    return fail("insufficient_stock", `No ${command.ingredientId} in the pantry`);
  }
  const requested = normalizeQuantity(command.quantity, command.unit);
  const available = rows.reduce(
    (total, { item }) => total + normalizeQuantity(item.quantity, item.unit).quantity,
    0,
  );
  if (available + 1e-9 < requested.quantity) {
    return fail(
      "insufficient_stock",
      `Cannot ${kind === "used" ? "use" : "waste"} ${command.quantity} ${command.unit} of ${command.ingredientId}; only ${roundQuantity(available)} ${requested.unit} in stock`,
    );
  }

  const fact = {
    id: `${kind}-${state.week}-${state.consumptionFacts.length}`,
    week: state.week,
    ingredientId: command.ingredientId,
    quantity: roundQuantity(requested.quantity),
    unit: requested.unit,
    kind,
  };
  return {
    ok: true,
    state: {
      ...state,
      pantry: drainPantry(state.pantry, command.ingredientId, command.quantity, command.unit),
      consumptionFacts: [...state.consumptionFacts, fact],
    },
  };
}

/**
 * Apply one explicit household command to the kitchen.
 *
 * Pure: no storage, no clocks, no randomness. Invalid expected operations
 * return `{ ok: false, error: { code, message } }` and leave state untouched.
 */
export function applyKitchenCommand(
  state: KitchenState,
  command: KitchenCommand,
): CommandResult {
  if (isJourneyComplete(state)) {
    return fail("journey_complete", "The eight-week journey is complete");
  }

  switch (command.type) {
    case "receive_grocery": {
      if (!Array.isArray(command.lines) || command.lines.length === 0) {
        return fail("invalid_command", "A grocery receipt needs at least one line");
      }
      let pantry = state.pantry;
      const facts = [...state.groceryFacts];
      for (const line of command.lines) {
        const invalid = validateQuantity(line.quantity, line.unit);
        if (invalid) return { ok: false, error: invalid };
        if (!line.ingredientId) {
          return fail("invalid_command", "Every grocery line needs an ingredient id");
        }
        const normalized = normalizeQuantity(line.quantity, line.unit);
        pantry = addToPantry(pantry, line.ingredientId, line.quantity, line.unit, state.week);
        facts.push({
          id: `grocery-${state.week}-${facts.length}`,
          week: state.week,
          ingredientId: line.ingredientId,
          quantity: normalized.quantity,
          unit: normalized.unit,
        });
      }
      return { ok: true, state: { ...state, pantry, groceryFacts: facts } };
    }

    case "consume_ingredient":
      return applyConsumption(state, command, "used");

    case "waste_ingredient":
      return applyConsumption(state, command, "wasted");

    case "select_meals": {
      const recipeIds = command.recipeIds;
      if (!Array.isArray(recipeIds) || recipeIds.some((id) => typeof id !== "string" || !id)) {
        return fail("invalid_command", "Meal selection needs recipe ids");
      }
      if (recipeIds.length > MAX_WEEKLY_MEALS) {
        return fail("too_many_meals", `A week holds at most ${MAX_WEEKLY_MEALS} meals`);
      }
      if (new Set(recipeIds).size !== recipeIds.length) {
        return fail("duplicate_selection", "The same recipe cannot be selected twice in a week");
      }
      const choices = choicesForWeek(state, state.week);
      return {
        ok: true,
        state: withChoices(state, { ...choices, selectedRecipeIds: [...recipeIds] }),
      };
    }

    case "skip_recommendation": {
      if (!command.recipeId) return fail("invalid_command", "A recipe id is required");
      const choices = choicesForWeek(state, state.week);
      const skipped = choices.skippedRecipeIds.includes(command.recipeId)
        ? choices.skippedRecipeIds
        : [...choices.skippedRecipeIds, command.recipeId];
      return { ok: true, state: withChoices(state, { ...choices, skippedRecipeIds: skipped }) };
    }

    case "decide_substitution": {
      if (!command.substitutionId) {
        return fail("invalid_command", "A substitution id is required");
      }
      const choices = choicesForWeek(state, state.week);
      const existing = choices.substitutionDecisions.find(
        (decision) => decision.substitutionId === command.substitutionId,
      );
      if (existing && existing.accepted === command.accepted) {
        return { ok: true, state };
      }
      const decisions = [
        ...choices.substitutionDecisions.filter(
          (decision) => decision.substitutionId !== command.substitutionId,
        ),
        { substitutionId: command.substitutionId, accepted: command.accepted },
      ];
      return { ok: true, state: withChoices(state, { ...choices, substitutionDecisions: decisions }) };
    }

    case "complete_meal": {
      if (!command.recipeId) return fail("invalid_command", "A recipe id is required");
      const already = state.mealFacts.some(
        (fact) => fact.week === state.week && fact.recipeId === command.recipeId,
      );
      if (already) {
        return fail("meal_already_completed", "This meal is already completed for this week");
      }
      const fact = {
        id: `meal-${state.week}-${state.mealFacts.length}`,
        week: state.week,
        recipeId: command.recipeId,
      };
      return { ok: true, state: { ...state, mealFacts: [...state.mealFacts, fact] } };
    }

    case "complete_week": {
      const choices = choicesForWeek(state, state.week);
      if (choices.completed) {
        return fail("week_already_completed", `Week ${state.week} is already complete`);
      }
      const completedState = withChoices(state, { ...choices, completed: true });
      if (state.week >= WEEK_MAX) {
        return { ok: true, state: completedState };
      }
      return { ok: true, state: { ...completedState, week: state.week + 1 } };
    }

    default: {
      const unknown = command as { type?: string };
      return fail("invalid_command", `Unknown command: ${String(unknown.type)}`);
    }
  }
}

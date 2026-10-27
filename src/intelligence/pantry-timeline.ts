import { canonicalUnitOf, normalizeQuantity, roundQuantity } from "@/domain/units";
import type { CanonicalUnit } from "@/domain/units";
import { compareStrings } from "@/domain/order";
import type { Catalog, Ingredient } from "@/catalog/types";
import { findProduct, ingredientById, recipeRequirements } from "@/catalog/grocery-graph";
import { MEAL_SLOTS, WEEK_DAYS } from "@/domain/kitchen/types";
import type { KitchenState, WeekDay } from "@/domain/kitchen/types";
import { effectiveRequirement } from "@/intelligence/basket";
import type { PlannedMeal, WeekIntelligence } from "@/intelligence/types";
import { deriveUseSoon } from "@/intelligence/use-soon";

/**
 * The pantry, played forward through the week's plan.
 *
 * Walks the assigned meals day by day against current stock and reports the
 * moments a household would care about: what to use today, what runs out on
 * which day (and whether this week's basket already covers it), and which
 * regulars are running low. Derived on demand; nothing is stored.
 */

export type PantryEvent =
  | { kind: "use_soon"; ingredient: Ingredient; day: WeekDay | null; recipeName: string | null }
  | {
      kind: "runs_out";
      ingredient: Ingredient;
      day: WeekDay;
      recipeName: string;
      cover: "basket" | "unavailable" | "none";
    }
  | { kind: "running_low"; ingredient: Ingredient; remaining: number; unit: CanonicalUnit };

export type ShelfItem = {
  ingredient: Ingredient;
  /** Stock as a share of one typical pack, 0..1. */
  level: number;
  flag: "use_soon" | "runs_out" | null;
};

export type PantryTimeline = { events: PantryEvent[]; shelf: ShelfItem[] };

export function orderedPlan(plan: PlannedMeal[]): PlannedMeal[] {
  return [...plan].sort(
    (a, b) =>
      WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day) ||
      MEAL_SLOTS.indexOf(a.slot) - MEAL_SLOTS.indexOf(b.slot),
  );
}

function eventDayIndex(event: PantryEvent): number {
  if (event.kind === "running_low" || event.day === null) return WEEK_DAYS.length;

  return WEEK_DAYS.indexOf(event.day);
}

function stockByIngredient(kitchen: KitchenState): Map<string, number> {
  const stock = new Map<string, number>();

  for (const item of kitchen.pantry) {
    const amount = normalizeQuantity(item.quantity, item.unit);
    const key = `${item.ingredientId}:${amount.unit}`;
    stock.set(key, (stock.get(key) ?? 0) + amount.quantity);
  }

  return stock;
}

export function buildPantryTimeline(
  kitchen: KitchenState,
  catalog: Catalog,
  intelligence: WeekIntelligence,
): PantryTimeline {
  const events: PantryEvent[] = [];
  const plan = orderedPlan(intelligence.plan);
  const stock = stockByIngredient(kitchen);
  const flaggedOut = new Set<string>();
  const firstUse = new Map<string, PlannedMeal>();

  for (const meal of plan) {
    const scale = kitchen.profile.memberCount / meal.recipe.servings;

    for (const requirement of recipeRequirements(catalog, meal.recipe)) {
      if (requirement.optional) continue;
      const effective = effectiveRequirement(kitchen, catalog, requirement);
      const need = normalizeQuantity(effective.quantity * scale, effective.unit);
      const key = `${effective.ingredientId}:${need.unit}`;
      const have = stock.get(key);

      if (!firstUse.has(effective.ingredientId)) firstUse.set(effective.ingredientId, meal);

      if (have === undefined) continue;

      if (have + 1e-9 < need.quantity && !flaggedOut.has(effective.ingredientId)) {
        const ingredient = ingredientById(catalog, effective.ingredientId);

        const basketItem = intelligence.basket.items.find(
          (item) => item.ingredientId === effective.ingredientId,
        );

        if (ingredient) {
          flaggedOut.add(effective.ingredientId);
          events.push({
            kind: "runs_out",
            ingredient,
            day: meal.day,
            recipeName: meal.recipe.name,
            cover:
              basketItem?.status === "buy"
                ? "basket"
                : basketItem?.status === "unavailable"
                  ? "unavailable"
                  : "none",
          });
        }
      }

      stock.set(key, roundQuantity(Math.max(0, have - need.quantity)));
    }
  }

  const useSoonIds = new Set<string>();

  for (const entry of deriveUseSoon(kitchen, catalog)) {
    if (useSoonIds.has(entry.ingredientId)) continue;
    const ingredient = ingredientById(catalog, entry.ingredientId);

    if (!ingredient) continue;
    useSoonIds.add(entry.ingredientId);
    const meal = firstUse.get(entry.ingredientId);
    events.push({
      kind: "use_soon",
      ingredient,
      day: meal?.day ?? null,
      recipeName: meal?.recipe.name ?? null,
    });
  }

  for (const suggestion of intelligence.replenishments) {
    if (flaggedOut.has(suggestion.ingredientId)) continue;
    events.push({
      kind: "running_low",
      ingredient: suggestion.ingredient,
      remaining: suggestion.remaining,
      unit: suggestion.unit,
    });
  }

  events.sort(
    (a, b) =>
      eventDayIndex(a) - eventDayIndex(b) ||
      compareStrings(a.kind, b.kind) ||
      compareStrings(a.ingredient.name, b.ingredient.name),
  );

  const shelf: ShelfItem[] = [];
  const initial = stockByIngredient(kitchen);
  const seen = new Set<string>();

  for (const item of kitchen.pantry) {
    if (seen.has(item.ingredientId)) continue;
    const ingredient = ingredientById(catalog, item.ingredientId);

    if (!ingredient) continue;
    seen.add(item.ingredientId);
    const unit = canonicalUnitOf(item.unit);
    const have = initial.get(`${item.ingredientId}:${unit}`) ?? 0;
    const product = findProduct(catalog, item.ingredientId, kitchen.profile.locationId);
    const pack = product ? normalizeQuantity(product.packSize, product.unit).quantity : have;

    shelf.push({
      ingredient,
      level: pack > 0 ? Math.min(1, roundQuantity(have / pack)) : 1,
      flag: useSoonIds.has(item.ingredientId)
        ? "use_soon"
        : flaggedOut.has(item.ingredientId)
          ? "runs_out"
          : null,
    });
  }

  shelf.sort(
    (a, b) =>
      Number(b.flag !== null) - Number(a.flag !== null) ||
      compareStrings(a.ingredient.name, b.ingredient.name),
  );

  return { events, shelf };
}

export type CarryOver = { ingredient: Ingredient; recipeName: string; day: WeekDay };

/**
 * The next meal this week that reuses a fresh ingredient from `day`'s meal:
 * "the coriander from tonight goes into Thursday's chole".
 */
export function carryOver(
  intelligence: WeekIntelligence,
  day: WeekDay,
): CarryOver | null {
  const dayIndex = WEEK_DAYS.indexOf(day);
  const today = intelligence.plan.filter((meal) => meal.day === day).map((meal) => meal.recipeId);

  if (today.length === 0) return null;

  let best: CarryOver | null = null;
  let bestIndex: number = WEEK_DAYS.length;

  for (const chain of intelligence.chains) {
    const { category } = chain.ingredient;

    if (category === "spice" || category === "fat" || category === "pantry") continue;

    if (!chain.recipeIds.some((id) => today.includes(id))) continue;

    for (const meal of orderedPlan(intelligence.plan)) {
      const index = WEEK_DAYS.indexOf(meal.day);

      if (index <= dayIndex || index >= bestIndex) continue;

      if (!chain.recipeIds.includes(meal.recipeId) || today.includes(meal.recipeId)) continue;
      best = { ingredient: chain.ingredient, recipeName: meal.recipe.name, day: meal.day };
      bestIndex = index;
    }
  }

  return best;
}

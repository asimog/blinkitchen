import { compareStrings } from "@/domain/order";
import { WEEK_MIN } from "@/domain/kitchen/types";
import type { PantryItem } from "@/domain/kitchen/types";
import type { Unit } from "@/domain/units";
import { findProduct, listStaples } from "@/catalog/grocery-graph";
import type { Catalog, Ingredient } from "@/catalog/types";

/**
 * Deterministic onboarding boundary: how a minute of answering becomes the
 * existing KitchenProfile fields and pantry facts. Pure data and pure
 * functions only; the wizard maps, the domain schema validates.
 */

export type SupportedDiet = "vegetarian" | "vegan";

export const DIET_OPTIONS: readonly { id: SupportedDiet; label: string }[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
];

export type PreferenceField =
  | "planningPreference"
  | "priceSensitivity"
  | "conveniencePreference"
  | "explorationPreference";

export type PreferenceValues = {
  planningPreference: number;
  priceSensitivity: number;
  conveniencePreference: number;
  explorationPreference: number;
};

export type PriorityChipId = "use_what_i_have" | "save_money" | "cook_quickly" | "try_new_dishes";

export type PriorityChip = {
  id: PriorityChipId;
  label: string;
  field: PreferenceField;
};

/** Priority chip -> existing internal profile field, one to one. */
export const PRIORITY_CHIPS: readonly PriorityChip[] = [
  { id: "use_what_i_have", label: "Use what I have", field: "planningPreference" },
  { id: "save_money", label: "Save money", field: "priceSensitivity" },
  { id: "cook_quickly", label: "Cook quickly", field: "conveniencePreference" },
  { id: "try_new_dishes", label: "Try new dishes", field: "explorationPreference" },
];

export const PRIORITY_SELECTED_VALUE = 0.8;

export const PRIORITY_NEUTRAL_VALUE = 0.5;

/** Chip -> profile values; unpicked fields keep the neutral 0.5. */
export function preferencesFromPriorities(priorities: readonly PriorityChipId[]): PreferenceValues {
  const selected = new Set(priorities);

  const values: PreferenceValues = {
    planningPreference: PRIORITY_NEUTRAL_VALUE,
    priceSensitivity: PRIORITY_NEUTRAL_VALUE,
    conveniencePreference: PRIORITY_NEUTRAL_VALUE,
    explorationPreference: PRIORITY_NEUTRAL_VALUE,
  };

  for (const chip of PRIORITY_CHIPS) {
    if (selected.has(chip.id)) values[chip.field] = PRIORITY_SELECTED_VALUE;
  }

  return values;
}

export type CookingFrequencyId = "most_days" | "few_days" | "once_or_twice" | "rarely";

export type CookingFrequencyOption = {
  id: CookingFrequencyId;
  label: string;
  days: number;
};

/** Approximate frequency chips -> the existing cookingDaysPerWeek fact. */
export const COOKING_FREQUENCY_OPTIONS: readonly CookingFrequencyOption[] = [
  { id: "most_days", label: "Most days", days: 6 },
  { id: "few_days", label: "A few days a week", days: 4 },
  { id: "once_or_twice", label: "Once or twice a week", days: 2 },
  { id: "rarely", label: "Rarely", days: 0 },
];

export function cookingDaysForFrequency(frequency: CookingFrequencyId): number {
  const option = COOKING_FREQUENCY_OPTIONS.find((candidate) => candidate.id === frequency);

  return option?.days ?? 4;
}

export type QuickPickGroupId = "pantry_basics" | "fresh_basics" | "regularly_bought";

export type QuickPickGroup = {
  id: QuickPickGroupId;
  label: string;
  ingredients: Ingredient[];
};

export const REGULARLY_BOUGHT_LIMIT = 8;

/**
 * Non-staple ingredients cooked most often, ranked by recipe occurrence with a
 * name tie-break. Derived from the read-only catalog; never authored by hand.
 */
export function listRegularlyBought(catalog: Catalog, limit: number): Ingredient[] {
  const counts = new Map<string, number>();

  for (const recipe of catalog.recipes) {
    for (const line of recipe.ingredients) {
      counts.set(line.ingredientId, (counts.get(line.ingredientId) ?? 0) + 1);
    }
  }

  const ranked: Ingredient[] = [];

  for (const ingredient of catalog.ingredients) {
    if (ingredient.staple) continue;

    if (!counts.has(ingredient.id)) continue;
    ranked.push(ingredient);
  }

  ranked.sort((a, b) => {
    const difference = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);

    return difference !== 0 ? difference : compareStrings(a.name, b.name);
  });

  return ranked.slice(0, limit);
}

/** Quick common ingredients, grouped for one glance: pantry, fresh, cooked often. */
export function quickPickGroups(catalog: Catalog): QuickPickGroup[] {
  const pantryBasics: Ingredient[] = [];
  const freshBasics: Ingredient[] = [];

  for (const ingredient of listStaples(catalog)) {
    if (ingredient.storageType === "perishable") {
      freshBasics.push(ingredient);
    } else {
      pantryBasics.push(ingredient);
    }
  }

  return [
    { id: "pantry_basics", label: "Pantry basics", ingredients: pantryBasics },
    { id: "fresh_basics", label: "Fresh basics", ingredients: freshBasics },
    {
      id: "regularly_bought",
      label: "Regularly bought",
      ingredients: listRegularlyBought(catalog, REGULARLY_BOUGHT_LIMIT),
    },
  ];
}

export type TypicalPack = {
  quantity: number;
  unit: Unit;
};

/**
 * One typical pack for an ingredient: the catalog's best available SKU at the
 * household's location. No invented multipliers; out-of-stock SKUs never win.
 */
export function typicalPack(
  catalog: Catalog,
  ingredientId: string,
  locationId: string,
): TypicalPack | undefined {
  const product = findProduct(catalog, ingredientId, locationId);

  if (!product) return undefined;

  return { quantity: product.packSize, unit: product.unit };
}

/**
 * Quick pick -> pantry facts: one typical pack per unique ingredient, at the
 * starting week. Order follows the picks, so the same input is the same output.
 */
export function pantryItemsFromQuickPicks(
  catalog: Catalog,
  ingredientIds: readonly string[],
  locationId: string,
): PantryItem[] {
  const items: PantryItem[] = [];
  const seen = new Set<string>();

  for (const ingredientId of ingredientIds) {
    if (seen.has(ingredientId)) continue;

    seen.add(ingredientId);
    const pack = typicalPack(catalog, ingredientId, locationId);

    if (!pack) continue;
    items.push({
      ingredientId,
      quantity: pack.quantity,
      unit: pack.unit,
      useSoon: false,
      acquiredWeek: WEEK_MIN,
    });
  }

  return items;
}

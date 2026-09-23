import type { Unit } from "@/domain/units";
import { compareStrings } from "@/domain/order";
import type { Catalog } from "@/catalog/types";
import type { KitchenState } from "@/domain/kitchen/types";
import { ingredientById } from "@/catalog/grocery-graph";

/**
 * Use-soon detection: explicit household flags plus derived staleness.
 * Nothing is written back to the pantry — both are projections of facts.
 */

export type UseSoonEntry = {
  ingredientId: string;
  quantity: number;
  unit: Unit;
  reason: "flagged" | "stale";
  /** Weeks the item has been in the kitchen, for explanations. */
  ageWeeks: number;
};

function stalenessWeeks(shelfLifeDays: number): number {
  return Math.max(1, Math.floor(shelfLifeDays / 7));
}

export function deriveUseSoon(kitchen: KitchenState, catalog: Catalog): UseSoonEntry[] {
  const entries: UseSoonEntry[] = [];

  for (const item of kitchen.pantry) {
    if (item.quantity <= 0) continue;
    const ingredient = ingredientById(catalog, item.ingredientId);
    const ageWeeks = Math.max(0, kitchen.week - item.acquiredWeek);
    const stale = ingredient ? ageWeeks >= stalenessWeeks(ingredient.shelfLifeDays) : false;

    if (!item.useSoon && !stale) continue;
    entries.push({
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      reason: item.useSoon ? "flagged" : "stale",
      ageWeeks,
    });
  }

  return entries.sort(
    (a, b) =>
      compareStrings(a.ingredientId, b.ingredientId) || compareStrings(a.reason, b.reason),
  );
}

import { canonicalUnitOf, normalizeQuantity, roundQuantity } from "@/domain/units";
import type { Unit } from "@/domain/units";
import type { Catalog } from "@/catalog/types";
import { ingredientById } from "@/catalog/grocery-graph";
import { pantryQuantity } from "@/domain/kitchen/state";
import type { KitchenState } from "@/domain/kitchen/types";
import type { Basket, ReplenishmentSuggestion } from "@/intelligence/types";
import { explainReplenishment } from "@/intelligence/explanations";

/**
 * Replenishment emerges from household history, not forecasting:
 * repeatedly consumed + low remaining stock + recent usage frequency.
 * The heuristic is intentionally transparent — the copy states each signal.
 */

const RECENT_WINDOW = 5;
const MIN_RECENT_WEEKS = 2;
const LOW_STOCK_WEEKS = 1.5;
const MAX_SUGGESTIONS = 5;

type Usage = {
  weeks: Set<number>;
  totalCanonical: number;
  unit: Unit;
};

function usageByIngredient(kitchen: KitchenState, catalog: Catalog): Map<string, Usage> {
  const usage = new Map<string, Usage>();
  for (const fact of kitchen.consumptionFacts) {
    if (fact.kind !== "used") continue;
    const ingredient = ingredientById(catalog, fact.ingredientId);
    if (!ingredient) continue;
    const normalized = normalizeQuantity(fact.quantity, fact.unit);
    const existing = usage.get(fact.ingredientId);
    if (existing) {
      existing.weeks.add(fact.week);
      existing.totalCanonical = roundQuantity(existing.totalCanonical + normalized.quantity);
    } else {
      usage.set(fact.ingredientId, {
        weeks: new Set([fact.week]),
        totalCanonical: normalized.quantity,
        unit: normalized.unit,
      });
    }
  }
  return usage;
}

export function recommendReplenishments(
  kitchen: KitchenState,
  catalog: Catalog,
  basket: Basket,
): ReplenishmentSuggestion[] {
  const suggestions: ReplenishmentSuggestion[] = [];
  const usage = usageByIngredient(kitchen, catalog);

  for (const [ingredientId, row] of usage) {
    const ingredient = ingredientById(catalog, ingredientId);
    if (!ingredient) continue;
    const usedWeeks = [...row.weeks].sort((a, b) => a - b);
    const recentWeeks = usedWeeks.filter((week) => week > kitchen.week - RECENT_WINDOW);
    if (recentWeeks.length < MIN_RECENT_WEEKS) continue;

    const windowStart = Math.max(1, kitchen.week - RECENT_WINDOW + 1);
    const weeksElapsed = kitchen.week - windowStart + 1;
    const recentQuantity = kitchen.consumptionFacts
      .filter(
        (fact) =>
          fact.kind === "used" &&
          fact.ingredientId === ingredientId &&
          fact.week >= windowStart,
      )
      .reduce((total, fact) => total + normalizeQuantity(fact.quantity, fact.unit).quantity, 0);
    const weeklyBurn = recentQuantity / weeksElapsed;
    if (weeklyBurn <= 0) continue;

    const displayUnit = canonicalUnitOf(ingredient.commonUnits[0] ?? "g");
    const remaining = normalizeQuantity(
      pantryQuantity(kitchen, ingredientId, displayUnit),
      displayUnit,
    ).quantity;
    const weeksLeft = remaining / weeklyBurn;
    if (weeksLeft > LOW_STOCK_WEEKS) continue;

    const alreadyInBasket = basket.items.some(
      (item) => item.ingredientId === ingredientId && item.status === "buy",
    );
    if (alreadyInBasket) continue;

    const score = Math.min(
      1,
      Math.max(
        0,
        0.6 * (recentWeeks.length / RECENT_WINDOW) +
          0.4 * (1 - Math.min(1, weeksLeft / LOW_STOCK_WEEKS)),
      ),
    );

    suggestions.push({
      ingredientId,
      ingredient,
      score: roundQuantity(score * 1000) / 1000,
      remaining,
      unit: displayUnit,
      usedWeeks: recentWeeks,
      explanation: explainReplenishment({
        usedWeekCount: recentWeeks.length,
        windowWeeks: RECENT_WINDOW,
        remaining,
        unit: displayUnit,
        weeksOfUseLeft: Math.max(0, Math.round(weeksLeft * 10) / 10),
      }),
    });
  }

  return suggestions
    .sort((a, b) => b.score - a.score || a.ingredientId.localeCompare(b.ingredientId))
    .slice(0, MAX_SUGGESTIONS);
}

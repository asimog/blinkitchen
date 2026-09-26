import { formatRupees, roundQuantity } from "@/domain/units";
import { compareStrings } from "@/domain/order";
import type { Catalog } from "@/catalog/types";
import { recipeById } from "@/catalog/grocery-graph";
import type { KitchenState } from "@/domain/kitchen/types";
import { buildWeekIntelligence } from "@/intelligence";
import type { Learning } from "@/intelligence/types";
import { humanizeId } from "@/intelligence/labels";

/**
 * Week 1 versus Week 8, derived from the same facts and the same engine.
 *
 * The product thesis is longitudinal: this projection is what the household
 * gained from eight weeks of recorded behaviour. It is pure, deterministic and
 * never persisted — a reviewer sees "what the system knew" next to "what it
 * learned" without interpreting eight separate screens.
 */

export type JourneyComparisonMetric = {
  id: "meals" | "coverage" | "reuse" | "swaps" | "waste" | "avoided";
  label: string;
  week1: string;
  week8: string;
  direction: "up" | "down" | "flat";
  explanation: string;
};

export type JourneyComparison = {
  householdId: string;
  householdName: string;
  weeksObserved: number;
  metrics: JourneyComparisonMetric[];
  week1Highlights: string[];
  week8Highlights: string[];
};

function topCuisine(learning: Learning): { cuisine: string; affinity: number } | undefined {
  const rows = Object.entries(learning.cuisineAffinity).sort(
    (a, b) => b[1] - a[1] || compareStrings(a[0], b[0]),
  );

  const top = rows[0];

  return top ? { cuisine: top[0], affinity: top[1] } : undefined;
}

function acceptedDecisions(kitchen: KitchenState): number {
  return kitchen.weeklyChoices.flatMap((row) =>
    row.substitutionDecisions.filter((decision) => decision.accepted),
  ).length;
}

function rejectedDecisions(kitchen: KitchenState): number {
  return kitchen.weeklyChoices.flatMap((row) =>
    row.substitutionDecisions.filter((decision) => !decision.accepted),
  ).length;
}

function cookedCuisineNames(kitchen: KitchenState, catalog: Catalog): string[] {
  const names = new Set<string>();

  for (const fact of kitchen.mealFacts) {
    const recipe = recipeById(catalog, fact.recipeId);

    if (recipe) names.add(recipe.cuisine);
  }

  return [...names].sort(compareStrings);
}

function direction(a: number, b: number): "up" | "down" | "flat" {
  if (b > a) return "up";

  if (b < a) return "down";

  return "flat";
}

export function compareJourney(kitchens: KitchenState[], catalog: Catalog): JourneyComparison {
  const first = kitchens[0];

  if (!first) throw new Error("compareJourney needs at least one kitchen state");

  const last = kitchens.at(-1) ?? first;
  const week1 = buildWeekIntelligence(first, catalog);
  const week8 = buildWeekIntelligence(last, catalog);
  const firstTop = topCuisine(week1.learning);
  const lastTop = topCuisine(week8.learning);

  const avoidedThrough = (index: number) =>
    roundQuantity(
      kitchens
        .slice(0, index + 1)
        .reduce(
          (total, kitchen) => total + buildWeekIntelligence(kitchen, catalog).basket.pantryValueAvoided,
          0,
        ),
    );

  const avoidedAtWeek1 = avoidedThrough(0);
  const avoidedByWeek8 = avoidedThrough(kitchens.length - 1);
  const weeks = kitchens.length;
  const cuisinesCooked = cookedCuisineNames(last, catalog);

  const metrics: JourneyComparisonMetric[] = [
    {
      id: "meals",
      label: "Meals recorded",
      week1: "0",
      week8: String(last.mealFacts.length),
      direction: direction(0, last.mealFacts.length),
      explanation: "Every cooked meal becomes behaviour the recommendations can learn from.",
    },
    {
      id: "coverage",
      label: "Plan already at home",
      week1: `${Math.round(week1.coverage.percent)}%`,
      week8: `${Math.round(week8.coverage.percent)}%`,
      direction: direction(week1.coverage.percent, week8.coverage.percent),
      explanation: "Coverage moves with what the kitchen holds and what the plan uses, week by week.",
    },
    {
      id: "reuse",
      label: "Shared ingredients in the plan",
      week1: String(week1.chains.length),
      week8: String(week8.chains.length),
      direction: direction(week1.chains.length, week8.chains.length),
      explanation: "Ingredients needed by more than one planned meal — buy once, cook more than once.",
    },
    {
      id: "swaps",
      label: "Substitution decisions",
      week1: "0",
      week8: String(acceptedDecisions(last) + rejectedDecisions(last)),
      direction: direction(0, acceptedDecisions(last) + rejectedDecisions(last)),
      explanation: "Accepted and rejected swaps change how future swaps are ranked.",
    },
    {
      id: "waste",
      label: "Items recorded as wasted",
      week1: "0",
      week8: String(last.consumptionFacts.filter((fact) => fact.kind === "wasted").length),
      direction: direction(0, last.consumptionFacts.filter((fact) => fact.kind === "wasted").length),
      explanation: "Spoilage is a recorded fact, and use-soon ranking responds to it.",
    },
    {
      id: "avoided",
      label: "Groceries avoided with pantry stock (cumulative)",
      week1: formatRupees(avoidedAtWeek1),
      week8: formatRupees(avoidedByWeek8),
      direction: direction(avoidedAtWeek1, avoidedByWeek8),
      explanation: "Simulated value of plan requirements already covered by what the kitchen holds.",
    },
  ];

  const week1Highlights = [
    `Started with ${first.pantry.length} pantry item${first.pantry.length === 1 ? "" : "s"} and ${first.mealFacts.length} recorded meals.`,
    firstTop
      ? `Starting point: ${humanizeId(firstTop.cuisine)} at ${Math.round(firstTop.affinity * 100)}% match.`
      : "No cuisine signal yet: recommendations came from stated preferences.",
  ];

  const week8Highlights = [
    `${last.mealFacts.length} meals, ${last.groceryFacts.length} grocery receipts and ${acceptedDecisions(last) + rejectedDecisions(last)} swap decisions recorded.`,
    cuisinesCooked.length > 0
      ? `Cuisines actually cooked: ${cuisinesCooked.map((cuisine) => humanizeId(cuisine)).join(", ")}.`
      : "No meals recorded yet.",
    lastTop
      ? `${humanizeId(lastTop.cuisine)} now leads at ${Math.round(lastTop.affinity * 100)}% (was ${firstTop ? Math.round(firstTop.affinity * 100) : 0}% at Week 1).`
      : "No cuisine signal yet.",
  ];

  return {
    householdId: first.id,
    householdName: first.profile.displayName,
    weeksObserved: weeks,
    metrics,
    week1Highlights,
    week8Highlights,
  };
}

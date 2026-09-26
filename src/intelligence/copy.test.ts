import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { buildWeekIntelligence } from "@/intelligence";
import { compareJourney } from "@/intelligence/journey";
import { buildFixtureKitchen, fixtureById } from "@/simulation/fixtures";
import { householdPolicy } from "@/simulation/policies";
import { simulateJourney } from "@/simulation/simulate";
import { makeKitchen, pantryItem } from "@/test-utils/kitchen";

const catalog = loadCatalog();

/**
 * Customer-facing reasoning must describe outcomes, not engine internals.
 * The banned list is deliberately short: add a word only when it has leaked
 * into copy and would confuse a household.
 */
const BANNED = /\b(affinity|compatibility|utility factors?|corpus|algorithm|embedding|optimiser)\b/i;

function explanationStrings(kitchen: ReturnType<typeof makeKitchen>): string[] {
  const intelligence = buildWeekIntelligence(kitchen, catalog);

  return [
    ...intelligence.recommendations.flatMap((row) => row.explanation),
    ...intelligence.plan.flatMap((meal) => meal.explanation),
    ...intelligence.basket.items.flatMap((item) => item.explanation),
    ...intelligence.substitutions.flatMap((suggestion) => suggestion.explanation),
    ...intelligence.replenishments.flatMap((suggestion) => suggestion.explanation),
    ...intelligence.chains.map((chain) => chain.explanation),
    ...intelligence.useSoon.map((entry) => entry.explanation),
    ...intelligence.narrative,
  ];
}

describe("customer-facing copy", () => {
  it("keeps engine vocabulary out of every explanation string", () => {
    const kitchen = makeKitchen(
      {},
      {
        cuisines: ["punjabi", "south_indian"],
        cookingDaysPerWeek: 5,
        explorationPreference: 0.8,
      },
      [
        pantryItem("spinach", 500, "g", { useSoon: true }),
        pantryItem("onion", 300, "g"),
        pantryItem("tomato", 300, "g"),
        pantryItem("rice", 500, "g"),
      ],
    );

    for (const line of explanationStrings(kitchen)) {
      expect(line, line).not.toMatch(BANNED);
    }
  });

  it("keeps engine vocabulary out of the Week 1 to Week 8 comparison", () => {
    const fixture = fixtureById("cuisine_explorer");

    if (!fixture) throw new Error("missing fixture");

    const states = simulateJourney(buildFixtureKitchen(fixture), catalog, householdPolicy);
    const comparison = compareJourney(states, catalog);

    const lines = [
      ...comparison.metrics.flatMap((metric) => [metric.label, metric.explanation]),
      ...comparison.week1Highlights,
      ...comparison.week8Highlights,
    ];

    for (const line of lines) {
      expect(line, line).not.toMatch(BANNED);
    }
  });
});

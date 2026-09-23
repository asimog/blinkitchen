import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import type { KitchenState } from "@/domain/kitchen/types";
import { buildBlinkitInsights } from "@/insights/blinkit";
import { buildFixtureKitchen, HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import { householdPolicy } from "@/simulation/policies";
import { simulateJourney } from "@/simulation/simulate";

const catalog = loadCatalog();

function cohort(): KitchenState[] {
  const states: KitchenState[] = [];

  for (const fixture of HOUSEHOLD_FIXTURES) {
    states.push(...simulateJourney(buildFixtureKitchen(fixture), catalog, householdPolicy));
  }

  return states;
}

describe("buildBlinkitInsights", () => {
  it("summarises the four simulated journeys without double counting facts", () => {
    const states = cohort();
    const insights = buildBlinkitInsights(states, catalog);
    expect(insights.simulated).toBe(true);
    expect(insights.households).toBe(4);
    expect(insights.weekSnapshots).toBe(32);
    expect(insights.archetypes).toHaveLength(4);

    for (const summary of insights.archetypes) {
      const finalState = states
        .filter((state) => state.id === summary.householdId)
        .sort((a, b) => b.week - a.week)[0];

      if (!finalState) throw new Error(`No final state for ${summary.householdId}`);
      expect(summary.mealsCooked).toBe(finalState.mealFacts.length);
      expect(summary.weeksObserved).toBe(8);
    }

    const totalMeals = insights.archetypes.reduce((total, row) => total + row.mealsCooked, 0);

    const expectedMeals = HOUSEHOLD_FIXTURES.reduce((total, fixture) => {
      const journey = simulateJourney(buildFixtureKitchen(fixture), catalog, householdPolicy);

      return total + (journey[journey.length - 1]?.mealFacts.length ?? 0);
    }, 0);

    expect(totalMeals).toBe(expectedMeals);
  });

  it("is deterministic and read-only", () => {
    const states = cohort();
    const snapshot = JSON.stringify(states);
    const first = buildBlinkitInsights(states, catalog);
    const second = buildBlinkitInsights(states, catalog);
    expect(first).toEqual(second);
    expect(JSON.stringify(states)).toBe(snapshot);
  });

  it("reports recurring gaps, reuse, use-soon and cuisine signals", () => {
    const insights = buildBlinkitInsights(cohort(), catalog);
    expect(insights.missingIngredients.length).toBeGreaterThan(0);
    expect(insights.missingIngredients[0]?.weeksMissing).toBeGreaterThanOrEqual(
      insights.missingIngredients[1]?.weeksMissing ?? 0,
    );
    expect(insights.missingIngredients.every((row) => row.share >= 1 && row.share <= 100)).toBe(
      true,
    );
    expect(insights.reusedIngredients.length).toBeGreaterThan(0);
    expect(insights.useSoonFrequency.length).toBeGreaterThan(0);
    expect(insights.cuisineSignals.some((row) => row.cuisine === "north_indian")).toBe(true);
    expect(insights.cumulativeBasketSpend).toBeGreaterThan(0);
    expect(insights.avoidedBasketValue).toBeGreaterThan(0);
  });

  it("reflects archetype differences in the cohort table", () => {
    const insights = buildBlinkitInsights(cohort(), catalog);
    const optimizer = insights.archetypes.find((row) => row.householdId === "sim-value_optimizer");
    const explorer = insights.archetypes.find((row) => row.householdId === "sim-cuisine_explorer");
    expect(optimizer?.acceptedSwaps).toBeGreaterThan(explorer?.acceptedSwaps ?? 0);
    expect(explorer?.rejectedSwaps).toBeGreaterThan(0);

    const convenience = insights.archetypes.find(
      (row) => row.householdId === "sim-convenience_household",
    );

    expect(convenience?.avgPreparationMinutes).toBeLessThan(
      optimizer?.avgPreparationMinutes ?? Infinity,
    );
    expect(insights.substitutionOutcomes.length).toBeGreaterThan(0);
  });

  it("labels everything as simulated in its narrative", () => {
    const insights = buildBlinkitInsights(cohort(), catalog);
    expect(insights.narrative.length).toBeGreaterThan(0);
    expect(insights.narrative.length).toBeLessThanOrEqual(6);
    expect(insights.narrative.join(" ")).toContain("simulated");
  });

  it("does not double count facts that live in every later snapshot", () => {
    const states = cohort();
    const insights = buildBlinkitInsights(states, catalog);

    const finalByHousehold = new Map<string, KitchenState>();

    for (const state of states) {
      const current = finalByHousehold.get(state.id);

      if (!current || state.week >= current.week) finalByHousehold.set(state.id, state);
    }

    const expectedDecisions = [...finalByHousehold.values()].reduce(
      (total, state) =>
        total +
        state.weeklyChoices.flatMap((row) => row.substitutionDecisions).length,
      0,
    );

    const countedDecisions = insights.substitutionOutcomes.reduce(
      (total, row) => total + row.accepted + row.rejected,
      0,
    );

    expect(countedDecisions).toBe(expectedDecisions);

    const expectedMeals = [...finalByHousehold.values()].reduce(
      (total, state) => total + state.mealFacts.length,
      0,
    );

    const countedMeals = insights.cuisineSignals.reduce((total, row) => total + row.meals, 0);
    expect(countedMeals).toBe(expectedMeals);

    const expectedSpoilage = [...finalByHousehold.values()].reduce(
      (total, state) =>
        total + state.consumptionFacts.filter((fact) => fact.kind === "wasted").length,
      0,
    );

    const countedSpoilage = insights.archetypes.reduce(
      (total, row) => total + row.spoilageEvents,
      0,
    );

    expect(countedSpoilage).toBe(expectedSpoilage);
  });

  it("handles an empty cohort", () => {
    const insights = buildBlinkitInsights([], catalog);
    expect(insights.households).toBe(0);
    expect(insights.simulated).toBe(true);
    expect(insights.archetypes).toEqual([]);
  });
});

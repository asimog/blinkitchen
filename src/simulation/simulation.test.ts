import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { kitchenStateSchema } from "@/domain/kitchen/schema";
import { buildWeekIntelligence } from "@/intelligence";
import { buildFixtureKitchen, fixtureById, HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import { householdPolicy, substitutionAcceptanceThreshold } from "@/simulation/policies";
import { simulateJourney, simulateWeek, SimulationError } from "@/simulation/simulate";
import type { KitchenState } from "@/domain/kitchen/types";
import { pantryItem } from "@/test-utils/kitchen";

const catalog = loadCatalog();

function journeyFor(fixtureId: string, weeks = 8): KitchenState[] {
  const fixture = fixtureById(fixtureId);
  if (!fixture) throw new Error(`Unknown fixture ${fixtureId}`);
  return simulateJourney(buildFixtureKitchen(fixture), catalog, householdPolicy, weeks);
}

function lastOf(states: KitchenState[]): KitchenState {
  const state = states[states.length - 1];
  if (!state) throw new Error("Empty journey");
  return state;
}

function planOf(kitchen: KitchenState): string[] {
  return buildWeekIntelligence(kitchen, catalog).plan.map((meal) => meal.recipeId);
}

function averagePreparation(kitchen: KitchenState): number {
  const plan = buildWeekIntelligence(kitchen, catalog).plan;
  if (plan.length === 0) return 0;
  return (
    plan.reduce((total, meal) => total + meal.recipe.estimatedPreparationMinutes, 0) / plan.length
  );
}

describe("deterministic journeys", () => {
  it("runs all four archetypes through weeks 1..8", () => {
    for (const fixture of HOUSEHOLD_FIXTURES) {
      const states = journeyFor(fixture.id);
      expect(states.map((state) => state.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(states.every((state) => kitchenStateSchema.safeParse(state).success)).toBe(true);
    }
  });

  it("produces identical results on repeat runs", () => {
    for (const fixture of HOUSEHOLD_FIXTURES) {
      const first = journeyFor(fixture.id);
      const second = journeyFor(fixture.id);
      expect(second).toEqual(first);
    }
  });

  it("keeps every state invariant: bounded weeks, non-negative pantry, valid schema", () => {
    for (const fixture of HOUSEHOLD_FIXTURES) {
      for (const state of journeyFor(fixture.id)) {
        expect(state.week).toBeGreaterThanOrEqual(1);
        expect(state.week).toBeLessThanOrEqual(8);
        for (const item of state.pantry) {
          expect(item.quantity).toBeGreaterThan(0);
        }
      }
    }
  });

  it("advances only through the same domain commands as the interactive flow", () => {
    const fixture = fixtureById("pantry_planner");
    if (!fixture) throw new Error("missing fixture");
    const states = simulateJourney(buildFixtureKitchen(fixture), catalog, householdPolicy);
    expect(states[0]?.mealFacts).toHaveLength(0);
    for (const state of states.slice(1)) {
      expect(state.mealFacts.length).toBeGreaterThan(0);
      expect(state.groceryFacts.length).toBeGreaterThan(0);
      for (const fact of state.groceryFacts) {
        expect(fact.week).toBeLessThanOrEqual(state.week);
      }
      for (const fact of state.mealFacts) {
        expect(fact.week).toBeLessThanOrEqual(state.week);
      }
    }
    const final = lastOf(states);
    const cookedRecipes = new Set(final.mealFacts.map((fact) => fact.recipeId));
    for (const recipeId of cookedRecipes) {
      expect(catalog.recipes.some((recipe) => recipe.id === recipeId)).toBe(true);
    }
  });

  it("is prefix-consistent: a four-week run matches the first four states of the full run", () => {
    for (const fixture of HOUSEHOLD_FIXTURES) {
      const full = journeyFor(fixture.id);
      const prefix = journeyFor(fixture.id, 4);
      expect(prefix).toEqual(full.slice(0, 4));
    }
  });

  it("has no hardcoded week-8 snapshot: different facts produce different outcomes", () => {
    const fixture = fixtureById("pantry_planner");
    if (!fixture) throw new Error("missing fixture");
    const plain = simulateJourney(buildFixtureKitchen(fixture), catalog, householdPolicy);
    const enriched = {
      ...buildFixtureKitchen(fixture),
      pantry: [...buildFixtureKitchen(fixture).pantry, pantryItem("paneer", 400, "g", { useSoon: true })],
    };
    const withPaneer = simulateJourney(enriched, catalog, householdPolicy);
    expect(planOf(lastOf(withPaneer))).not.toEqual(planOf(lastOf(plain)));
  });

  it("surfaces typed errors instead of throwing when a policy produces an invalid command", () => {
    const states = journeyFor("pantry_planner", 2);
    const invalidPolicy = () => [
      { type: "consume_ingredient" as const, ingredientId: "paneer", quantity: 10_000, unit: "g" as const },
    ];
    const result = simulateWeek(lastOf(states), catalog, invalidPolicy);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("insufficient_stock");
  });
});

describe("archetype behaviour emerges from inputs", () => {
  it("adapts recommendations as facts accumulate", () => {
    for (const fixture of HOUSEHOLD_FIXTURES) {
      const states = journeyFor(fixture.id);
      const week1 = buildWeekIntelligence(states[0] as KitchenState, catalog);
      const week8 = buildWeekIntelligence(lastOf(states), catalog);
      const scoresWeek1 = week1.recommendations.map((row) => `${row.recipe.id}:${row.score}`);
      const scoresWeek8 = week8.recommendations.map((row) => `${row.recipe.id}:${row.score}`);
      expect(scoresWeek8).not.toEqual(scoresWeek1);
    }
  });

  it("Pantry Planner: high utilisation, low waste, strong chaining", () => {
    const states = journeyFor("pantry_planner");
    const final = lastOf(states);
    const intelligence = buildWeekIntelligence(final, catalog);
    const first = buildWeekIntelligence(states[0] as KitchenState, catalog);
    expect(intelligence.coverage.percent).toBeGreaterThanOrEqual(first.coverage.percent);
    expect(intelligence.basket.pantryValueAvoided).toBeGreaterThan(0);
    expect(intelligence.chains.filter((chain) => chain.recipeIds.length >= 3).length).toBeGreaterThan(0);
    const wasteEvents = final.consumptionFacts.filter((fact) => fact.kind === "wasted").length;
    const convenienceWaste = lastOf(journeyFor("convenience_household")).consumptionFacts.filter(
      (fact) => fact.kind === "wasted",
    ).length;
    expect(wasteEvents).toBeLessThanOrEqual(convenienceWaste);
  });

  it("Cuisine Explorer: discovery meals and non-preferred cuisine affinity", () => {
    const states = journeyFor("cuisine_explorer");
    const final = lastOf(states);
    const intelligence = buildWeekIntelligence(final, catalog);
    const planCuisines = new Set(intelligence.plan.map((meal) => meal.recipe.cuisine));
    expect(
      [...planCuisines].some((cuisine) => cuisine === "indo_chinese" || cuisine === "mexican"),
    ).toBe(true);
    expect(intelligence.learning.cuisineAffinity["indo_chinese"]).toBeGreaterThan(0.25);
    expect(intelligence.learning.cuisineAffinity["mexican"]).toBeGreaterThan(0.25);
  });

  it("Value Optimizer: accepts the most swaps and answers with weakenings after rejections", () => {
    const value = lastOf(journeyFor("value_optimizer"));
    const explorer = lastOf(journeyFor("cuisine_explorer"));
    const acceptances = (state: KitchenState) =>
      state.weeklyChoices.flatMap((row) =>
        row.substitutionDecisions.filter((decision) => decision.accepted),
      ).length;
    const rejections = (state: KitchenState) =>
      state.weeklyChoices.flatMap((row) =>
        row.substitutionDecisions.filter((decision) => !decision.accepted),
      ).length;
    expect(acceptances(value)).toBeGreaterThan(acceptances(explorer));
    expect(rejections(value)).toBe(0);
    expect(rejections(explorer)).toBeGreaterThan(0);
    const explorerAffinity = buildWeekIntelligence(explorer, catalog).learning
      .substitutionAffinity;
    expect(Object.values(explorerAffinity).some((affinity) => affinity < 0)).toBe(true);
  });

  it("Convenience Household: smallest plan, shortest prep, lightest basket", () => {
    const states = journeyFor("convenience_household");
    const final = lastOf(states);
    const intelligence = buildWeekIntelligence(final, catalog);
    expect(intelligence.plan).toHaveLength(3);
    expect(averagePreparation(final)).toBeLessThan(averagePreparation(lastOf(journeyFor("pantry_planner"))));
    expect(averagePreparation(final)).toBeLessThan(averagePreparation(lastOf(journeyFor("value_optimizer"))));
    const basketTotal = (state: KitchenState) => buildWeekIntelligence(state, catalog).basket.totalCost;
    expect(basketTotal(final)).toBeLessThan(basketTotal(lastOf(journeyFor("pantry_planner"))));
    expect(substitutionAcceptanceThreshold(final)).toBeGreaterThan(
      substitutionAcceptanceThreshold(lastOf(journeyFor("value_optimizer"))),
    );
  });

  it("runs the same policy for every archetype", () => {
    expect(HOUSEHOLD_FIXTURES).toHaveLength(4);
    expect(substitutionAcceptanceThreshold(lastOf(journeyFor("value_optimizer")))).toBeLessThan(0.5);
    expect(substitutionAcceptanceThreshold(lastOf(journeyFor("cuisine_explorer")))).toBeGreaterThan(0.6);
  });
});

describe("SimulationError", () => {
  it("carries the failing command and typed error code", () => {
    const error = new SimulationError(3, { type: "complete_week" }, {
      code: "week_already_completed",
      message: "Week 3 is already complete",
    });
    expect(error.message).toContain("week 3");
    expect(error.message).toContain("week_already_completed");
  });
});

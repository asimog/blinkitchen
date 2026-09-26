import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { compareJourney } from "@/intelligence/journey";
import { buildFixtureKitchen, fixtureById } from "@/simulation/fixtures";
import { householdPolicy } from "@/simulation/policies";
import { simulateJourney } from "@/simulation/simulate";

const catalog = loadCatalog();

function journeyFor(fixtureId: string) {
  const fixture = fixtureById(fixtureId);

  if (!fixture) throw new Error(`Unknown fixture ${fixtureId}`);

  return simulateJourney(buildFixtureKitchen(fixture), catalog, householdPolicy);
}

describe("compareJourney", () => {
  it("is deterministic and read-only", () => {
    const states = journeyFor("pantry_planner");
    const snapshot = JSON.stringify(states);
    const first = compareJourney(states, catalog);
    const second = compareJourney(states, catalog);
    expect(second).toEqual(first);
    expect(JSON.stringify(states)).toBe(snapshot);
  });

  it("covers meals, coverage, reuse, swaps, waste and avoided value", () => {
    const comparison = compareJourney(journeyFor("pantry_planner"), catalog);
    expect(comparison.metrics.map((metric) => metric.id)).toEqual([
      "meals",
      "coverage",
      "reuse",
      "swaps",
      "waste",
      "avoided",
    ]);
    expect(comparison.metrics.every((metric) => metric.week1.length > 0 && metric.week8.length > 0)).toBe(true);
    expect(comparison.week1Highlights.join(" ")).toContain("pantry");
    expect(comparison.week8Highlights.join(" ")).toContain("meals");
  });

  it("reports what eight weeks of facts added", () => {
    const states = journeyFor("pantry_planner");
    const comparison = compareJourney(states, catalog);
    const final = states.at(-1)!;
    const meals = comparison.metrics.find((metric) => metric.id === "meals");
    const avoided = comparison.metrics.find((metric) => metric.id === "avoided");
    expect(meals?.week8).toBe(String(final.mealFacts.length));
    expect(meals?.direction).toBe("up");
    expect(avoided?.direction).toBe("up");
  });

  it("differs between households, because the facts differ", () => {
    const planner = compareJourney(journeyFor("pantry_planner"), catalog);
    const explorer = compareJourney(journeyFor("cuisine_explorer"), catalog);
    expect(planner.householdName).not.toBe(explorer.householdName);
    expect(planner.metrics).not.toEqual(explorer.metrics);
    expect(planner.week8Highlights).not.toEqual(explorer.week8Highlights);
  });
});

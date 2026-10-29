import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { applyKitchenCommand } from "@/domain/kitchen/commands";
import type { KitchenCommand } from "@/domain/kitchen/commands";
import type { KitchenState, MealSelection } from "@/domain/kitchen/types";
import { buildWeekIntelligence } from "@/intelligence";
import { householdWeeks } from "@/intelligence/journey";
import { buildPantryTimeline, carryOver } from "@/intelligence/pantry-timeline";
import { buildRemixStories, storySkippedRecipeId } from "@/intelligence/remix";
import { closeWeek } from "@/intelligence/week-close";
import { makeKitchen, pantryItem } from "@/test-utils/kitchen";

const catalog = loadCatalog();

function run(kitchen: KitchenState, ...commands: KitchenCommand[]): KitchenState {
  let state = kitchen;

  for (const command of commands) {
    const result = applyKitchenCommand(state, command);

    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
  }

  return state;
}

function withMeals(kitchen: KitchenState, meals: Omit<MealSelection, "slot">[]): KitchenState {
  return run(kitchen, {
    type: "select_meals",
    meals: meals.map((meal) => ({ ...meal, slot: "dinner" })),
  });
}

function close(kitchen: KitchenState): KitchenState {
  const result = closeWeek(kitchen, catalog, buildWeekIntelligence(kitchen, catalog));

  if (!result.ok) throw new Error(result.error.message);

  return result.state;
}

const twoOnionDinners = [
  { day: "monday", recipeId: "rajma_chawal" },
  { day: "tuesday", recipeId: "chole" },
] as const;

describe("pantry timeline", () => {
  it("flags the day an ingredient runs out, and only for stock the household has", () => {
    const short = withMeals(makeKitchen({}, {}, [pantryItem("onion", 200)]), [...twoOnionDinners]);
    const events = buildPantryTimeline(short, catalog, buildWeekIntelligence(short, catalog)).events;
    const onion = events.find((event) => event.kind === "runs_out" && event.ingredient.id === "onion");
    expect(onion).toMatchObject({ day: "tuesday", recipeName: "Chole Masala", cover: "basket" });
    expect(events.some((event) => event.kind === "runs_out" && event.ingredient.id === "chana")).toBe(false);

    const stocked = withMeals(makeKitchen({}, {}, [pantryItem("onion", 1000)]), [...twoOnionDinners]);
    const stockedEvents = buildPantryTimeline(stocked, catalog, buildWeekIntelligence(stocked, catalog)).events;
    expect(stockedEvents.some((event) => event.kind === "runs_out" && event.ingredient.id === "onion")).toBe(false);
  });

  it("dates a use-soon item to the meal that uses it", () => {
    const pantry = [pantryItem("spinach", 500, "g", { useSoon: true })];
    const planned = withMeals(makeKitchen({}, {}, pantry), [{ day: "wednesday", recipeId: "palak_paneer" }]);
    const unplanned = withMeals(makeKitchen({}, {}, pantry), [{ day: "wednesday", recipeId: "chole" }]);

    const plannedTimeline = buildPantryTimeline(planned, catalog, buildWeekIntelligence(planned, catalog));
    const unplannedTimeline = buildPantryTimeline(unplanned, catalog, buildWeekIntelligence(unplanned, catalog));

    expect(plannedTimeline.events.find((event) => event.kind === "use_soon")).toMatchObject({ day: "wednesday" });
    expect(unplannedTimeline.events.find((event) => event.kind === "use_soon")).toMatchObject({ day: null });
    expect(plannedTimeline.shelf[0]).toMatchObject({ flag: "use_soon" });
  });

  it("carries a fresh ingredient from today into a later meal", () => {
    const kitchen = withMeals(makeKitchen(), [
      { day: "monday", recipeId: "rajma_chawal" },
      { day: "wednesday", recipeId: "chole" },
    ]);

    const intelligence = buildWeekIntelligence(kitchen, catalog);
    expect(carryOver(intelligence, "monday")).toMatchObject({ day: "wednesday", recipeName: "Chole Masala" });
    expect(carryOver(intelligence, "wednesday")).toBeNull();
  });
});

describe("closing a week", () => {
  it("counts every assigned meal as cooked without the household reporting it", () => {
    const kitchen = withMeals(makeKitchen(), [...twoOnionDinners]);
    const closed = close(kitchen);
    expect(closed.week).toBe(2);
    expect(closed.mealFacts.map((fact) => fact.recipeId)).toEqual(["rajma_chawal", "chole"]);
  });

  it("only consumes what is actually in stock", () => {
    const kitchen = withMeals(makeKitchen({}, {}, [pantryItem("onion", 100)]), [...twoOnionDinners]);
    const closed = close(kitchen);
    const onionUsed = closed.consumptionFacts.filter((fact) => fact.ingredientId === "onion");
    expect(onionUsed.reduce((total, fact) => total + fact.quantity, 0)).toBe(100);
  });

  it("reports how much of a week was cooked from home", () => {
    const pantry = [pantryItem("onion", 1000), pantryItem("tomato", 1000)];
    const fromHome = householdWeeks(close(withMeals(makeKitchen({}, {}, pantry), [...twoOnionDinners])), catalog);
    const fromEmpty = withMeals(makeKitchen(), [...twoOnionDinners]);
    const basket = buildWeekIntelligence(fromEmpty, catalog).basket;

    const bought = run(fromEmpty, {
      type: "receive_grocery",
      lines: basket.items
        .filter((item) => item.status === "buy")
        .map((item) => ({ ingredientId: item.ingredientId, quantity: item.purchasedQuantity, unit: item.unit })),
    });

    const fromShop = householdWeeks(close(bought), catalog);

    expect(fromHome[0]?.mealsCooked).toBe(2);
    expect(fromHome[0]?.homeSharePercent).toBeGreaterThan(0);
    expect(fromShop[0]?.homeSharePercent).toBe(0);
  });
});

describe("remix stories", () => {
  it("follows what the household did last week and drops what it turned down", () => {
    const pantry = [pantryItem("onion", 2000), pantryItem("tomato", 2000), pantryItem("coriander", 200)];
    const weekTwo = close(withMeals(makeKitchen({}, {}, pantry), [...twoOnionDinners]));
    const stories = buildRemixStories(weekTwo, catalog, buildWeekIntelligence(weekTwo, catalog));

    expect(stories.length).toBeGreaterThan(0);
    const swap = stories.find((story) => story.kind === "swap");
    expect(["rajma_chawal", "chole"]).toContain(swap?.kind === "swap" ? swap.from.id : "none");

    const dismissed = stories.find((story) => storySkippedRecipeId(story) !== null);
    const skippedId = dismissed ? storySkippedRecipeId(dismissed) : null;
    expect(skippedId).not.toBeNull();

    const afterSkip = run(weekTwo, { type: "skip_recommendation", recipeId: skippedId ?? "" });
    const again = buildRemixStories(afterSkip, catalog, buildWeekIntelligence(afterSkip, catalog));
    expect(again.map(storySkippedRecipeId)).not.toContain(skippedId);
  });
});

describe("meal slots and skipped days", () => {
  it("plans every covered slot with recipes for that slot, and leaves skipped days empty", () => {
    const kitchen = run(
      makeKitchen({}, { cookingDaysPerWeek: 7, mealSlots: ["breakfast", "dinner"] }),
      { type: "set_day_skipped", day: "wednesday", skipped: true },
    );

    const plan = buildWeekIntelligence(kitchen, catalog).suggestedPlan;
    expect(plan.some((meal) => meal.day === "wednesday")).toBe(false);
    expect(plan.filter((meal) => meal.slot === "breakfast")).toHaveLength(6);
    expect(plan.every((meal) => meal.recipe.mealSlots.includes(meal.slot))).toBe(true);

    const dinnersOnly = buildWeekIntelligence(makeKitchen({}, { cookingDaysPerWeek: 7 }), catalog).suggestedPlan;
    expect(dinnersOnly.every((meal) => meal.slot === "dinner")).toBe(true);
    expect(dinnersOnly).toHaveLength(7);
  });

  it("skipping a day clears its meals, and planning a meal there un-skips it", () => {
    const planned = withMeals(makeKitchen(), [...twoOnionDinners]);
    const skipped = run(planned, { type: "set_day_skipped", day: "monday", skipped: true });
    const choices = skipped.weeklyChoices.find((row) => row.week === skipped.week);
    expect(choices?.skippedDays).toEqual(["monday"]);
    expect(choices?.selectedMeals.map((meal) => meal.day)).toEqual(["tuesday"]);

    const back = withMeals(skipped, [{ day: "monday", recipeId: "chole" }]);
    expect(back.weeklyChoices.find((row) => row.week === back.week)?.skippedDays).toEqual([]);
  });
});

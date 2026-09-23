import { createKitchenState } from "@/domain/kitchen/state";
import type { KitchenProfile, KitchenState, PantryItem } from "@/domain/kitchen/types";

/**
 * Four household archetypes. They are NOT four algorithms: each fixture is a
 * different input (preference vector, pantry seed, budget, location, plan size)
 * driving the same engine. Behaviour differences must emerge, not be coded.
 */

type ArchetypeId =
  | "pantry_planner"
  | "cuisine_explorer"
  | "value_optimizer"
  | "convenience_household";

export type HouseholdFixture = {
  id: ArchetypeId;
  archetype: string;
  tagline: string;
  description: string;
  householdName: string;
  profile: KitchenProfile;
  pantry: PantryItem[];
};

function item(
  ingredientId: string,
  quantity: number,
  unit: PantryItem["unit"],
  useSoon = false,
): PantryItem {
  return { ingredientId, quantity, unit, useSoon, acquiredWeek: 1 };
}

export const HOUSEHOLD_FIXTURES: HouseholdFixture[] = [
  {
    id: "pantry_planner",
    archetype: "Pantry Planner",
    tagline: "Cooks around what is already home",
    description:
      "High planning, high pantry awareness, low waste tolerance. Expect higher pantry utilisation, a smaller incremental basket and strong ingredient chaining.",
    householdName: "The Mehtas",
    profile: {
      displayName: "The Mehtas",
      memberCount: 4,
      locationId: "delhi_south",
      weeklyBudget: 1650,
      diet: "vegetarian",
      cuisines: ["punjabi", "north_indian"],
      cookingDaysPerWeek: 6,
      mealsCookedPerDay: 2,
      conveniencePreference: 0.28,
      priceSensitivity: 0.55,
      explorationPreference: 0.18,
      planningPreference: 0.92,
      equipment: ["pressure_cooker", "tawa", "mixer_grinder"],
      kitchenType: "existing",
      starterIngredientIds: [],
    },
    pantry: [
      item("rajma", 240, "g"),
      item("rice", 560, "g"),
      item("onion", 280, "g"),
      item("tomato", 200, "g"),
      item("oil", 420, "ml"),
      item("atta", 500, "g"),
      item("spinach", 250, "g", true),
      item("cumin", 40, "g"),
      item("turmeric", 30, "g"),
      item("garam_masala", 30, "g"),
      item("salt", 500, "g"),
    ],
  },
  {
    id: "cuisine_explorer",
    archetype: "Cuisine Explorer",
    tagline: "Tries unfamiliar dishes on purpose",
    description:
      "High exploration across several cuisines. Expect discovery recommendations, cuisine variation, and affinities that shift as meals accumulate.",
    householdName: "The Khannas",
    profile: {
      displayName: "The Khannas",
      memberCount: 3,
      locationId: "delhi_south",
      weeklyBudget: 1900,
      diet: "vegetarian",
      cuisines: ["punjabi", "indo_chinese", "mexican"],
      cookingDaysPerWeek: 5,
      mealsCookedPerDay: 2,
      conveniencePreference: 0.42,
      priceSensitivity: 0.42,
      explorationPreference: 0.94,
      planningPreference: 0.58,
      equipment: ["pressure_cooker", "wok", "tawa"],
      kitchenType: "existing",
      starterIngredientIds: [],
    },
    pantry: [
      item("rice", 300, "g"),
      item("tofu", 120, "g", true),
      item("garlic", 80, "g"),
      item("oil", 300, "ml"),
      item("coriander", 60, "g", true),
      item("turmeric", 20, "g"),
      item("salt", 400, "g"),
    ],
  },
  {
    id: "value_optimizer",
    archetype: "Value Optimizer",
    tagline: "Makes every rupee work",
    description:
      "High price sensitivity and openness to swaps. Expect lower-cost baskets, more accepted substitutions and value-oriented picks.",
    householdName: "The Sharmas",
    profile: {
      displayName: "The Sharmas",
      memberCount: 4,
      locationId: "delhi_central",
      weeklyBudget: 1300,
      diet: "vegetarian",
      cuisines: ["punjabi", "north_indian"],
      cookingDaysPerWeek: 6,
      mealsCookedPerDay: 2,
      conveniencePreference: 0.3,
      priceSensitivity: 0.96,
      explorationPreference: 0.25,
      planningPreference: 0.76,
      equipment: ["pressure_cooker", "tawa"],
      kitchenType: "existing",
      starterIngredientIds: [],
    },
    pantry: [
      item("atta", 800, "g"),
      item("potato", 600, "g"),
      item("onion", 200, "g"),
      item("tomato", 150, "g"),
      item("oil", 500, "ml"),
      item("salt", 500, "g"),
    ],
  },
  {
    id: "convenience_household",
    archetype: "Convenience Household",
    tagline: "Short prep, few ingredients",
    description:
      "High convenience preference, lower planning. Expect simpler recipes with fewer ingredients and lower preparation time.",
    householdName: "The Iyers",
    profile: {
      displayName: "The Iyers",
      memberCount: 2,
      locationId: "delhi_central",
      weeklyBudget: 1750,
      diet: "vegetarian",
      cuisines: ["north_indian", "punjabi"],
      cookingDaysPerWeek: 3,
      mealsCookedPerDay: 2,
      conveniencePreference: 0.96,
      priceSensitivity: 0.45,
      explorationPreference: 0.36,
      planningPreference: 0.25,
      equipment: ["microwave", "tawa"],
      kitchenType: "existing",
      starterIngredientIds: [],
    },
    pantry: [
      item("rice", 200, "g"),
      item("yogurt", 150, "g"),
      item("poha", 150, "g", true),
      item("cumin", 20, "g"),
      item("ghee", 80, "ml"),
      item("salt", 300, "g"),
    ],
  },
];

export function fixtureById(id: string): HouseholdFixture | undefined {
  return HOUSEHOLD_FIXTURES.find((fixture) => fixture.id === id);
}

/** Build a fresh Week 1 kitchen for a fixture. Pure; safe to call repeatedly. */
export function buildFixtureKitchen(fixture: HouseholdFixture): KitchenState {
  return createKitchenState({
    id: `sim-${fixture.id}`,
    profile: fixture.profile,
    pantry: fixture.pantry,
  });
}

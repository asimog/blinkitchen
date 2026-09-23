import type { KitchenProfile, KitchenState, PantryItem } from "@/domain/kitchen/types";
import { createKitchenState } from "@/domain/kitchen/state";

export const testProfile: KitchenProfile = {
  displayName: "Test Kitchen",
  memberCount: 4,
  locationId: "delhi_south",
  weeklyBudget: 1500,
  diet: "vegetarian",
  cuisines: ["punjabi", "north_indian"],
  cookingDaysPerWeek: 5,
  mealsCookedPerDay: 2,
  conveniencePreference: 0.4,
  priceSensitivity: 0.5,
  explorationPreference: 0.3,
  planningPreference: 0.7,
  equipment: ["pressure_cooker", "tawa"],
  kitchenType: "existing",
  starterIngredientIds: [],
};

export function makeKitchen(
  overrides: Partial<KitchenState> = {},
  profileOverrides: Partial<KitchenProfile> = {},
  pantry: PantryItem[] = [],
): KitchenState {
  const state = createKitchenState({
    id: "test-kitchen",
    profile: { ...testProfile, ...profileOverrides },
    pantry,
  });
  return { ...state, ...overrides };
}

export function pantryItem(
  ingredientId: string,
  quantity: number,
  unit: PantryItem["unit"] = "g",
  extras: Partial<PantryItem> = {},
): PantryItem {
  return { ingredientId, quantity, unit, useSoon: false, acquiredWeek: 1, ...extras };
}

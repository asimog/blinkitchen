import { z } from "zod";
import { unitSchema } from "@/domain/units";
import { MAX_WEEKLY_MEALS, WEEK_MAX, WEEK_MIN } from "@/domain/kitchen/types";

const weekSchema = z.number().int().min(WEEK_MIN).max(WEEK_MAX);

const preferenceSchema = z.number().min(0).max(1);

export const kitchenProfileSchema = z.strictObject({
  displayName: z.string().trim().min(2).max(80),
  memberCount: z.number().int().min(1).max(20),
  locationId: z.string().min(1).max(120),
  weeklyBudget: z.number().int().min(100).max(100_000),
  diet: z.enum(["vegetarian", "vegan", "eggetarian", "non_vegetarian", "flexible"]),
  cuisines: z.array(z.string().min(1)).min(1).max(9),
  cookingDaysPerWeek: z.number().int().min(0).max(7),
  mealsCookedPerDay: z.number().int().min(1).max(3),
  conveniencePreference: preferenceSchema,
  priceSensitivity: preferenceSchema,
  explorationPreference: preferenceSchema,
  planningPreference: preferenceSchema,
  equipment: z.array(z.string().min(1)).max(12),
  kitchenType: z.enum(["fresh", "existing"]),
  starterIngredientIds: z.array(z.string().min(1)).max(100),
});

export const pantryItemSchema = z
  .strictObject({
    ingredientId: z.string().min(1),
    quantity: z.number().finite().min(0).max(1_000_000),
    unit: unitSchema,
    useSoon: z.boolean(),
    acquiredWeek: weekSchema,
  })
  .refine((item) => item.quantity > 0, {
    message: "Pantry quantities must be positive; remove the item instead",
  });

export const groceryFactSchema = z.strictObject({
  id: z.string().min(1),
  week: weekSchema,
  ingredientId: z.string().min(1),
  quantity: z.number().finite().positive().max(1_000_000),
  unit: unitSchema,
});

export const consumptionFactSchema = z.strictObject({
  id: z.string().min(1),
  week: weekSchema,
  ingredientId: z.string().min(1),
  quantity: z.number().finite().positive().max(1_000_000),
  unit: unitSchema,
  kind: z.enum(["used", "wasted"]),
});

export const mealFactSchema = z.strictObject({
  id: z.string().min(1),
  week: weekSchema,
  recipeId: z.string().min(1),
});

export const substitutionDecisionSchema = z.strictObject({
  substitutionId: z.string().min(1),
  accepted: z.boolean(),
});

export const weeklyChoicesSchema = z
  .strictObject({
    week: weekSchema,
    selectedRecipeIds: z.array(z.string().min(1)).max(MAX_WEEKLY_MEALS),
    skippedRecipeIds: z.array(z.string().min(1)).max(50),
    substitutionDecisions: z.array(substitutionDecisionSchema).max(50),
    completed: z.boolean(),
  })
  .refine((choices) => new Set(choices.selectedRecipeIds).size === choices.selectedRecipeIds.length, {
    message: "Selected recipes must be unique",
  });

export const kitchenStateSchema = z  .strictObject({
    id: z.string().min(1),
    profile: kitchenProfileSchema,
    week: weekSchema,
    pantry: z.array(pantryItemSchema).max(200),
    groceryFacts: z.array(groceryFactSchema).max(5_000),
    consumptionFacts: z.array(consumptionFactSchema).max(5_000),
    mealFacts: z.array(mealFactSchema).max(2_000),
    weeklyChoices: z.array(weeklyChoicesSchema).max(WEEK_MAX),
    createdAt: z.string().optional(),
  })
  .refine(
    (state) => new Set(state.pantry.map((item) => item.ingredientId)).size === state.pantry.length,
    { message: "Pantry holds at most one row per ingredient" },
  )
  .refine((state) => !(state.profile.kitchenType === "fresh" && state.pantry.length > 0), {
    message: "A fresh kitchen starts empty; mark expected essentials instead",
  })
  .refine(
    (state) =>
      !(state.profile.kitchenType === "existing" && state.profile.starterIngredientIds.length > 0),
    { message: "Starter essentials only apply to fresh kitchens" },
  );

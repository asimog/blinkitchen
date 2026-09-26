import { z } from "zod";
import { unitSchema } from "@/domain/units";

export const ingredientSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["vegetables", "dairy", "protein", "pantry", "fat", "spice"]),
  storageType: z.enum(["perishable", "shelf_stable", "frozen"]),
  commonUnits: z.array(unitSchema).min(1),
  shelfLifeDays: z.number().int().positive(),
  staple: z.boolean(),
  dietaryAttributes: z.array(z.enum(["vegetarian", "vegan"])).min(1),
  /** Ingestion-only provenance: never read by the domain or intelligence. */
  aliases: z.array(z.string().min(1)),
});

export const recipeIngredientSchema = z.strictObject({
  ingredientId: z.string().min(1),
  quantity: z.number().positive(),
  unit: unitSchema,
  optional: z.boolean(),
});

export const recipeSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  cuisine: z.string().min(1),
  mealSlots: z.array(z.enum(["breakfast", "lunch", "dinner"])).min(1).max(3),
  sourceUrl: z.url(),
  servings: z.number().int().positive(),
  ingredients: z.array(recipeIngredientSchema).min(1),
  dietaryAttributes: z.array(z.enum(["vegetarian", "vegan"])).min(1),
  preparationComplexity: z.enum(["low", "medium", "high"]),
  estimatedPreparationMinutes: z.number().int().positive(),
  discoveryLevel: z.enum(["familiar", "explore"]),
  tags: z.array(z.string().min(1)),
});

export const productTemplateSchema = z.strictObject({
  id: z.string().min(1),
  ingredientId: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  packSize: z.number().positive(),
  unit: unitSchema,
  basePrice: z.number().positive(),
});

export const locationSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  city: z.string().min(1),
  priceMultiplier: z.number().positive(),
  availabilityMultiplier: z.number().min(0).max(1),
});

export const substitutionSchema = z.strictObject({
  id: z.string().min(1),
  requestedIngredientId: z.string().min(1),
  substituteIngredientId: z.string().min(1),
  compatibilityScore: z.number().min(0).max(1),
  quantityRatio: z.number().positive().max(10),
  cuisines: z.array(z.string().min(1)),
  explanation: z.string().min(1),
});

export const ingredientsFileSchema = z.array(ingredientSchema);

export const recipesFileSchema = z.array(recipeSchema);

export const productTemplatesFileSchema = z.array(productTemplateSchema);

export const locationsFileSchema = z.array(locationSchema);

export const substitutionsFileSchema = z.array(substitutionSchema);

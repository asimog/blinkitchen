import type { DietaryAttribute, Ingredient, Recipe } from "@/catalog/types";
import type { DietPreference } from "@/domain/kitchen/types";

/**
 * Diet compatibility is a hard filter, always respected for recipes and for
 * suggested substitutions. Vegetarian households see only recipes and
 * ingredients tagged vegetarian (vegan implies vegetarian); non-vegetarian
 * households see everything.
 */

function allowed(attributes: DietaryAttribute[], diet: DietPreference): boolean {
  if (diet === "non_vegetarian") return true;

  return attributes.includes("vegetarian") || attributes.includes("vegan");
}

export function recipeAllowedForDiet(recipe: Recipe, diet: DietPreference): boolean {
  return allowed(recipe.dietaryAttributes, diet);
}

export function ingredientAllowedForDiet(ingredient: Ingredient, diet: DietPreference): boolean {
  return allowed(ingredient.dietaryAttributes, diet);
}

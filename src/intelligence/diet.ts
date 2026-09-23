import type { Recipe } from "@/catalog/types";
import type { Ingredient } from "@/catalog/types";
import type { DietPreference } from "@/domain/kitchen/types";

/**
 * Diet compatibility is a hard filter, always respected for recipes and for
 * suggested substitutions. vegan <= vegetarian <= eggetarian <= everything.
 */

export function recipeAllowedForDiet(recipe: Recipe, diet: DietPreference): boolean {
  const has = (attribute: string) => recipe.dietaryAttributes.includes(attribute as never);
  switch (diet) {
    case "vegan":
      return has("vegan");
    case "vegetarian":
    case "eggetarian":
      return has("vegetarian") || has("vegan");
    case "non_vegetarian":
    case "flexible":
      return true;
  }
}

export function ingredientAllowedForDiet(ingredient: Ingredient, diet: DietPreference): boolean {
  const has = (attribute: string) => ingredient.dietaryAttributes.includes(attribute as never);
  switch (diet) {
    case "vegan":
      return has("vegan");
    case "vegetarian":
    case "eggetarian":
      return has("vegetarian") || has("vegan");
    case "non_vegetarian":
    case "flexible":
      return true;
  }
}

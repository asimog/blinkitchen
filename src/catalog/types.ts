import type { Unit } from "@/domain/units";

export type IngredientCategory =
  | "vegetables"
  | "dairy"
  | "protein"
  | "pantry"
  | "fat"
  | "spice";

export type StorageType = "perishable" | "shelf_stable" | "frozen";

export type DietaryAttribute = "vegetarian" | "vegan";

export type MealType = "breakfast" | "lunch_dinner" | "snack";

export type PreparationComplexity = "low" | "medium" | "high";

export type DiscoveryLevel = "familiar" | "explore";

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  storageType: StorageType;
  /** Units this ingredient can be stocked or cooked in. */
  commonUnits: Unit[];
  /** Typical shelf life in days; used to derive staleness, never persisted. */
  shelfLifeDays: number;
  /** Everyday staple: suggested as a starter essential for fresh kitchens. */
  staple: boolean;
  dietaryAttributes: DietaryAttribute[];
};

export type RecipeIngredient = {
  ingredientId: string;
  quantity: number;
  unit: Unit;
  optional: boolean;
};

export type Recipe = {
  id: string;
  name: string;
  cuisine: string;
  mealType: MealType;
  servings: number;
  ingredients: RecipeIngredient[];
  dietaryAttributes: DietaryAttribute[];
  preparationComplexity: PreparationComplexity;
  estimatedPreparationMinutes: number;
  discoveryLevel: DiscoveryLevel;
  tags: string[];
};

/** Authoring shape for simulated SKUs; expanded per location at load time. */
export type ProductTemplate = {
  id: string;
  ingredientId: string;
  name: string;
  brand: string;
  packSize: number;
  unit: Unit;
  basePrice: number;
};

export type Product = {
  skuId: string;
  ingredientId: string;
  name: string;
  brand: string;
  packSize: number;
  unit: Unit;
  price: number;
  locationId: string;
  inventoryStatus: InventoryStatus;
  /** Explicit provenance: these are fictional products. */
  simulated: true;
};

export type Location = {
  id: string;
  name: string;
  city: string;
  priceMultiplier: number;
  availabilityMultiplier: number;
};

export type Substitution = {
  id: string;
  requestedIngredientId: string;
  substituteIngredientId: string;
  /** 0..1 explicit compatibility; never inferred from text similarity. */
  compatibilityScore: number;
  /** Substitute quantity per unit of requested quantity. */
  quantityRatio: number;
  cuisines: string[];
  explanation: string;
};

export type Catalog = {
  ingredients: Ingredient[];
  recipes: Recipe[];
  products: Product[];
  locations: Location[];
  substitutions: Substitution[];
};

export type RecipeRequirement = {
  ingredient: Ingredient;
  quantity: number;
  unit: Unit;
  optional: boolean;
};

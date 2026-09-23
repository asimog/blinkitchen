import type { Unit } from "@/domain/units";

/** Bounded week model: the prototype demonstrates Weeks 1 through 8. */
export const WEEK_MIN = 1;

export const WEEK_MAX = 8;

/** Maximum number of meals a household can select for one week. */
export const MAX_WEEKLY_MEALS = 7;

export type DietPreference =
  | "vegetarian"
  | "vegan"
  | "eggetarian"
  | "non_vegetarian"
  | "flexible";

export type KitchenType = "fresh" | "existing";

/**
 * The minimum useful starting context for intelligence. All values are stated
 * facts from the household; nothing here is derived.
 */
export type KitchenProfile = {
  displayName: string;
  memberCount: number;
  locationId: string;
  weeklyBudget: number;
  diet: DietPreference;
  /** Preferred cuisines, canonical cuisine ids from the catalog. */
  cuisines: string[];
  cookingDaysPerWeek: number;
  mealsCookedPerDay: number;
  /** 0..1 preferences. */
  conveniencePreference: number;
  priceSensitivity: number;
  explorationPreference: number;
  planningPreference: number;
  equipment: string[];
  kitchenType: KitchenType;
  /**
   * Fresh kitchens may name essentials they expect to stock. Informational:
   * these are intentions, not pantry stock, and never counted as inventory.
   */
  starterIngredientIds: string[];
};

/** Current physical stock. Quantities are nonnegative; stock never goes below zero. */
export type PantryItem = {
  ingredientId: string;
  quantity: number;
  unit: Unit;
  /** Explicit household flag: "use this soon". */
  useSoon: boolean;
  /** Week the item entered the kitchen (staleness evidence). */
  acquiredWeek: number;
};

/** Append-only fact: groceries received into the kitchen. */
export type GroceryFact = {
  id: string;
  week: number;
  ingredientId: string;
  quantity: number;
  unit: Unit;
};

/** Append-only fact: ingredient consumed or wasted. */
export type ConsumptionFact = {
  id: string;
  week: number;
  ingredientId: string;
  quantity: number;
  unit: Unit;
  kind: "used" | "wasted";
};

/** Append-only fact: a meal was completed. */
export type MealFact = {
  id: string;
  week: number;
  recipeId: string;
};

/** Explicit household decision about one offered substitution. */
export type SubstitutionDecision = {
  substitutionId: string;
  accepted: boolean;
};

/**
 * Explicit week-scoped user choices. This is the only channel for household
 * decisions: selected meals, skipped recommendations and substitution
 * decisions. Nothing derived is ever stored here.
 */
export type WeeklyChoices = {
  week: number;
  selectedRecipeIds: string[];
  skippedRecipeIds: string[];
  substitutionDecisions: SubstitutionDecision[];
  completed: boolean;
};

/**
 * The single authoritative household model.
 *
 * Facts in, intelligence out. Recommendations, scores, baskets, coverage,
 * chains, explanations and learning are never stored here.
 */
export type KitchenState = {
  id: string;
  profile: KitchenProfile;
  /** Current week, bounded to 1..8. */
  week: number;
  pantry: PantryItem[];
  groceryFacts: GroceryFact[];
  consumptionFacts: ConsumptionFact[];
  mealFacts: MealFact[];
  weeklyChoices: WeeklyChoices[];
  /** Set only by the storage/UI boundary, never by pure domain functions. */
  createdAt?: string;
};

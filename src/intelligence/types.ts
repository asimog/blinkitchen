import type { CanonicalUnit, Unit } from "@/domain/units";
import type { MealSlot, WeekDay } from "@/domain/kitchen/types";
import type {
  Ingredient,
  Product,
  Recipe,
  Substitution,
} from "@/catalog/types";

/**
 * Derived projections. Nothing in this file is ever persisted: these types are
 * recomputed by buildWeekIntelligence from kitchen facts + catalog on demand.
 */

export type Learning = {
  /** Cuisine id -> 0..1 affinity, derived from profile + completed meals. */
  cuisineAffinity: Record<string, number>;
  /** `${requested}->${substitute}` -> -1..1 derived from explicit decisions. */
  substitutionAffinity: Record<string, number>;
  priceSensitivityEvidence: number;
  convenienceEvidence: number;
  explorationTendency: number;
  frequentIngredients: { ingredientId: string; uses: number }[];
  wastedIngredients: { ingredientId: string; wasteEvents: number }[];
  cookedRecipes: { recipeId: string; count: number }[];
};

export type MealFactors = {
  pantryFit: number;
  cuisineFit: number;
  ingredientReuse: number;
  budgetFit: number;
  convenience: number;
  useSoonBenefit: number;
};

export type MealImpact = {
  /** Share of requirement lines already covered by compatible pantry stock. */
  coveragePercent: number;
  /** Simulated rupees needed for the missing quantities of this single meal. */
  additionalCost: number;
  ownedIngredientIds: string[];
  missingIngredientIds: string[];
  usesUseSoonIngredientIds: string[];
};

export type MealRecommendation = {
  recipe: Recipe;
  score: number;
  factors: MealFactors;
  impact: MealImpact;
  /** Ingredient ids shared with at least one other top-ranked meal. */
  sharedIngredientIds: string[];
  explanation: string[];
};

export type PlannedMeal = {
  recipeId: string;
  recipe: Recipe;
  source: "selected" | "suggested";
  day: WeekDay;
  slot: MealSlot;
  /** One to three derived sentences: why this meal, given the plan so far. */
  explanation: string[];
};

export type PlanFactors = {
  pantryCoverage: number;
  crossMealReuse: number;
  cuisineFit: number;
  convenienceFit: number;
  incrementalCost: number;
  useSoonRescue: number;
  variety: number;
};

export type PlanCandidateEvaluation = {
  recipe: Recipe;
  utility: number;
  factors: PlanFactors;
  coveragePercent: number;
  incrementalCost: number;
  reuseIngredientIds: string[];
  rescuedUseSoonIds: string[];
  cuisineRepeats: number;
  explanation: string[];
};

export type BasketItemStatus = "covered" | "buy" | "unavailable";

/**
 * A recipe requirement after this week's accepted substitutions: what the
 * kitchen actually needs to buy, cook and consume.
 */
export type EffectiveRequirement = {
  ingredientId: string;
  quantity: number;
  unit: Unit;
  substitution?: Substitution;
};

export type BasketItem = {
  ingredientId: string;
  ingredient: Ingredient;
  required: number;
  owned: number;
  missing: number;
  unit: CanonicalUnit;
  packCount: number;
  purchasedQuantity: number;
  product?: Product;
  lineCost: number;
  status: BasketItemStatus;
  usedInRecipeIds: string[];
  explanation: string[];
};

export type Basket = {
  items: BasketItem[];
  totalCost: number;
  /** Simulated value of all required quantities at catalog prices. */
  requiredValue: number;
  /** Simulated value of required quantities already covered by pantry stock. */
  pantryValueAvoided: number;
  coveragePercent: number;
  fulfillable: boolean;
  simulated: true;
};

export type IngredientChain = {
  ingredientId: string;
  ingredient: Ingredient;
  recipeIds: string[];
  recipeNames: string[];
  totalRequired: number;
  unit: CanonicalUnit;
  explanation: string;
};

export type UseSoonOpportunity = {
  ingredientId: string;
  ingredient: Ingredient;
  quantity: number;
  unit: Unit;
  reason: "flagged" | "stale";
  explanation: string;
};

export type SubstitutionSuggestion = {
  substitution: Substitution;
  requestedIngredient: Ingredient;
  substituteIngredient: Ingredient;
  score: number;
  /** How many times this direction was accepted / rejected so far. */
  acceptedCount: number;
  rejectedCount: number;
  explanation: string[];
};

export type ReplenishmentSuggestion = {
  ingredientId: string;
  ingredient: Ingredient;
  score: number;
  remaining: number;
  unit: CanonicalUnit;
  usedWeeks: number[];
  explanation: string[];
};

export type PantryCoverage = {
  /** Quantity-weighted share of the plan already in the kitchen (0..100). */
  percent: number;
  coveredValue: number;
  requiredValue: number;
  simulated: true;
};

export type WeekIntelligence = {
  week: number;
  learning: Learning;
  recommendations: MealRecommendation[];
  plan: PlannedMeal[];
  planSource: "selected" | "suggested";
  suggestedPlan: PlannedMeal[];
  basket: Basket;
  chains: IngredientChain[];
  useSoon: UseSoonOpportunity[];
  substitutions: SubstitutionSuggestion[];
  replenishments: ReplenishmentSuggestion[];
  coverage: PantryCoverage;
  narrative: string[];
};

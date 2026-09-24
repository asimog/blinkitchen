# Data Model

Everything below is verified against the current code. Where behaviour is
limiting or incomplete, it is stated as a limitation rather than smoothed over.

## KitchenState: the single authority

```ts
type KitchenState = {
  id: string;
  profile: KitchenProfile;
  week: number;                        // 1..8, bounded
  pantry: PantryItem[];                // current physical stock (fact)
  groceryFacts: GroceryFact[];          // append-only: what was received
  consumptionFacts: ConsumptionFact[];  // append-only: used | wasted
  mealFacts: MealFact[];                // append-only: meals completed
  weeklyChoices: WeeklyChoices[];       // explicit week-scoped household decisions
  createdAt?: string;                   // set only by the storage/UI boundary
};
```

### KitchenProfile

```ts
type KitchenProfile = {
  displayName: string;          // 2..80 chars
  memberCount: number;          // 1..20
  locationId: string;
  weeklyBudget: number;         // 100..100000 (integer)
  diet: DietPreference;         // vegetarian | vegan | eggetarian | non_vegetarian | flexible
  cuisines: string[];           // 1..9 canonical cuisine ids
  cookingDaysPerWeek: number;   // 0..7
  conveniencePreference: number; // 0..1
  priceSensitivity: number;      // 0..1
  explorationPreference: number; // 0..1
  planningPreference: number;    // 0..1
  kitchenType: KitchenType;      // existing | fresh
  starterIngredientIds: string[]; // <=100; intentions for a fresh kitchen, never stock
};
```

Current limitation: the type supports five diets, but the catalog only carries
`vegetarian` and `vegan` attributes and onboarding only offers those two. There
are no egg or meat ingredients, so `eggetarian`, `non_vegetarian` and `flexible`
currently behave as "allow everything".

### PantryItem

```ts
type PantryItem = {
  ingredientId: string;   // canonical ingredient id
  quantity: number;       // >= 0, canonical units only
  unit: Unit;             // g | kg | ml | l | piece | packet
  useSoon: boolean;       // explicit household flag
  acquiredWeek: number;   // when it entered the kitchen (staleness evidence)
};
```

### Facts

```ts
type GroceryFact     = { id; week; ingredientId; quantity; unit };
type ConsumptionFact = { id; week; ingredientId; quantity; unit; kind: "used" | "wasted" };
type MealFact        = { id; week; recipeId; day: WeekDay; slot: MealSlot };
```

Facts are append-only and week-stamped. Fact ids are derived from week, index and
content, never from clocks.

### WeeklyChoices

```ts
type WeeklyChoices = {
  week: number;
  selectedMeals: { day: WeekDay; slot: MealSlot; recipeId: string }[]; // <=21
  skippedRecipeIds: string[];                                         // <=50
  substitutionDecisions: { substitutionId: string; accepted: boolean }[]; // <=50
  completed: boolean;
};
```

This is the only channel for explicit household decisions. Design note: the
original specification listed `recommendationFeedback` as a separate fact array.
It is folded in here because selected meals, skipped recommendations and
substitution decisions are all week-scoped explicit choices: one channel, no
duplicate authority. `preferenceFacts` is omitted entirely: stated preferences are
profile facts, and behavioural preference evidence is derived from the other
facts.

### Week intent

```text
WEEK_MIN 1 · WEEK_MAX 8 · WEEK_DAYS 7 · MEAL_SLOTS breakfast|lunch|dinner
MAX_WEEKLY_MEALS 21 · suggested plan size = min(7, cookingDaysPerWeek)
```

### What must never be persisted

Recommended meals, ranking scores, baskets, pantry coverage, ingredient chains,
substitutions, replenishments, explanations, learning summaries and Blinkit
insights. All of these are recomputed from facts plus catalog on every render.

## Catalog: read-only

```ts
type Catalog = {
  ingredients: Ingredient[];
  recipes: Recipe[];
  products: Product[];        // expanded from templates × locations at load
  locations: Location[];
  substitutions: Substitution[];
};

type Ingredient = {
  id; name;
  category: "vegetables" | "dairy" | "protein" | "pantry" | "fat" | "spice";
  storageType: "perishable" | "shelf_stable" | "frozen";
  commonUnits: Unit[];
  shelfLifeDays: number;      // used to derive staleness, never persisted
  staple: boolean;            // "everyday staple" catalog hint, offered to fresh kitchens
  dietaryAttributes: ("vegetarian" | "vegan")[];
};

type RecipeIngredient = { ingredientId; quantity; unit; optional: boolean };

type Recipe = {
  id; name; sourceUrl; cuisine;
  mealSlots: ("breakfast" | "lunch" | "dinner")[];
  servings; ingredients: RecipeIngredient[];
  dietaryAttributes;
  preparationComplexity: "low" | "medium" | "high";
  estimatedPreparationMinutes;
  discoveryLevel: "familiar" | "explore";
  tags: string[];
};

type Product = {
  skuId; ingredientId; name; brand; packSize; unit; price;
  locationId;
  inventoryStatus: "in_stock" | "low_stock" | "out_of_stock";
  simulated: true;            // explicit provenance: fictional product
};

type Location = { id; name; city; priceMultiplier; availabilityMultiplier };

type Substitution = {
  id;
  requestedIngredientId; substituteIngredientId;
  compatibilityScore;   // 0..1, explicit, never inferred from text similarity
  quantityRatio;        // substitute quantity per unit requested
  cuisines: string[];
  explanation: string;
};
```

Recipes reference canonical ingredients, never SKUs. Products reference an
ingredient and a location. The commerce layer decides how requirements map to
packages. `RecipeRequirement` is the resolved authoring shape used by the engine:
`{ ingredient, quantity, unit, optional }`.

### Current seed counts (verified)

| Item | Count |
| --- | --- |
| Canonical ingredients | 43 (18 flagged `staple`) |
| Ingredient categories | 6 (13 vegetables, 11 spices, 8 proteins, 6 pantry, 3 dairy, 2 fats) |
| Storage split | 27 shelf stable, 15 perishable, 1 frozen |
| Shelf life range | 4 to 730 days |
| Recipes | 14 (12 familiar, 2 explore) |
| Cuisines | 4 (Punjabi, North Indian, Indo-Chinese, Mexican) |
| Recipes with optional ingredient lines | 1 (`aloo_paratha`, bread, 50 g) |
| Simulated product templates | 46 (10 brands, ₹15 to ₹320) |
| Locations | 2 (`delhi_south`, `delhi_central`) |
| Expanded SKU rows | 92 (46 templates × 2 locations) |
| Directed substitution relationships | 8 (paneer↔tofu, rajma↔chana, toor dal↔moong dal, ghee↔oil) |
| Household fixtures | 4 |
| Journey length | 8 weeks |

## Units

Supported units: `g`, `kg`, `ml`, `l`, `piece`, `packet`. Canonical units:
`g`, `ml`, `piece`, `packet`. Normalization converts `kg → g` and `l → ml` only.
Units belong to dimensions (mass, volume, piece, packet) and only same-dimension
quantities are comparable. Cross-dimension conversion (for example pieces to
grams) is never inferred: intelligence reports the full requirement as missing
rather than guessing. Pantry stock can never go negative; `consume` and `waste`
commands fail with a typed error code instead. Quantities are rounded to two
decimal places.

## Derived projections

```ts
type WeekIntelligence = {
  week: number;
  learning: Learning;
  recommendations: MealRecommendation[];  // ranked, each with factors, impact, explanation
  plan: PlannedMeal[];                    // effective plan (selected or suggested)
  planSource: "selected" | "suggested";
  suggestedPlan: PlannedMeal[];           // always the engine's suggestion
  basket: Basket;
  chains: IngredientChain[];
  useSoon: UseSoonOpportunity[];
  substitutions: SubstitutionSuggestion[];
  replenishments: ReplenishmentSuggestion[];
  coverage: PantryCoverage;
  narrative: string[];                    // up to 6 "what changed" sentences
};

type Learning = {
  cuisineAffinity: Record<string, number>;        // 0..1, profile + cooked meals
  substitutionAffinity: Record<string, number>;   // "requested->substitute" -> -1..1
  priceSensitivityEvidence: number;               // 0.5 × profile + 0.5 × cheap share
  convenienceEvidence: number;                    // 0.5 × profile + 0.5 × low-complexity share
  explorationTendency: number;                    // 0.5 × profile + 0.5 × explore share
  frequentIngredients: { ingredientId; uses }[];  // top 8
  wastedIngredients: { ingredientId; wasteEvents }[];
  cookedRecipes: { recipeId; count }[];
};
```

Projection mechanics, all deterministic:

- **Meal impact** (`computeMealImpact`): for each requirement line, coverage is
  `min(1, owned / required)`; `coveragePercent` is the average across lines. Cost
  is the simulated value of the missing quantities for that one meal.
- **Basket** (`buildBasket`): aggregate plan requirements by ingredient and
  canonical unit, subtract pantry stock, resolve the cheapest available simulated
  SKU for that unit, and round up pack counts. Coverage is value-weighted:
  `coveredValue / requiredValue`. Line status is `covered`, `buy` or `unavailable`.
- **Effective requirement** (`effectiveRequirement`): accepted substitutions
  replace the requested ingredient everywhere (meal impact, cards, basket and the
  simulation's cooking commands), scaled by `quantityRatio`.
- **Chains** (`findIngredientChains`): ingredients required by two or more planned
  meals, with ubiquitous ingredients (present in at least 60% of recipes) demoted
  so specific ingredients lead the story.
- **Use-soon** (`deriveUseSoon`): explicit `useSoon` flags plus staleness, where an
  item is stale once its age in weeks reaches `max(1, floor(shelfLifeDays / 7))`.
  Nothing is written back to the pantry.
- **Replenishment** (`recommendReplenishments`): consumption facts within the last
  5 weeks, at least 2 recent weeks of use, weekly burn from recent quantities,
  remaining stock below 1.5 weeks of burn, and not already in the basket. Score is
  `0.6 × (recent weeks / 5) + 0.4 × (1 - min(1, weeksLeft / 1.5))`, capped at 5
  suggestions.
- **Substitutions** (`recommendSubstitutions`): only explicit catalog
  relationships, only for basket lines being bought, only when the substitute is
  diet-allowed and has a matching simulated SKU. Score is
  `0.6 × compatibility + 0.4 × affinity01`, plus 0.05 for a cuisine match, capped
  at 4 suggestions. Affinity moves by +1 per acceptance and -1 per rejection,
  clamped to -1..1 after dividing by 2.

## Scoring

Recipe ranking weights are centralized in `MEAL_WEIGHTS`
(`src/intelligence/meals.ts`):

```text
pantry fit 30% · cuisine fit 20% · ingredient reuse 15%
budget fit 15% · convenience 10% · use-soon benefit 10%
```

Factor derivation (all normalized to 0..1):

- `pantryFit` = meal coverage × (0.6 + 0.4 × planningPreference)
- `cuisineFit` = derived affinity, adjusted by exploration tendency (discovery
  recipes gain, familiar recipes lose)
- `budgetFit` = 1 − additionalCost / per-meal allowance, where the allowance is
  `max(60, weeklyBudget / 7)`
- `convenience` = prep-time score sharpened by observed convenience evidence,
  multiplied by a complexity factor
- `useSoonBenefit` = share of use-soon items used by the meal, scaled by planning
- `ingredientReuse` = specificity-weighted reuse potential: for each unique recipe
  ingredient, `1 / (number of diet-allowed recipes using it)`, normalized against
  the best raw score in the catalog

Ranking penalties: skipped recommendations −0.25; meals cooked in the last two
weeks −0.08 each, capped at −0.16. Ties break on recipe id, so ordering is total
and deterministic.

**Important limitation.** `ingredientReuse` is a meal-level reuse signal computed
from the recipe corpus, not a whole-week optimisation. `suggestPlan` takes the
highest-ranked meals (one dinner slot per cooking day, up to 7) and, when
`explorationPreference >= 0.7`, swaps the final slot for a discovery meal. Chains
are then detected on the resulting plan. Plan-level optimisation across marginal
cost, pantry use, real cross-meal reuse, use-soon rescue and variety is a planned
enhancement, not current behaviour.

## BlinkitInsights

```ts
type BlinkitInsights = {
  simulated: true;
  households: number;
  weekSnapshots: number;
  missingIngredients: { ingredientId; name; weeksMissing; share }[];
  reusedIngredients: { ingredientId; name; appearances }[];
  useSoonFrequency: { ingredientId; name; occurrences }[];
  substitutionOutcomes: { substitutionId; label; accepted; rejected }[];
  replenishmentSignals: { ingredientId; name; households }[];
  cuisineSignals: { cuisine; meals }[];
  cumulativeBasketSpend: number;
  avoidedBasketValue: number;
  archetypes: {
    householdId; householdName; weeksObserved; mealsCooked; basketSpend;
    finalCoveragePercent; acceptedSwaps; rejectedSwaps; spoilageEvents;
    reuseChains; avgPreparationMinutes;
  }[];
  narrative: string[];
};
```

`buildBlinkitInsights` is a read model. It cannot mutate kitchen state and never
becomes a data authority. It receives **week snapshots** (the eight weekly states
of each journey, 32 in total for four fixtures). Two rules keep its numbers
honest:

- Per-week projections (basket spend, coverage, missing, reuse and use-soon
  signals) are summed across snapshots, where each snapshot represents exactly one
  week.
- Recorded history (substitution decisions, meals cooked, spoilage) is read from
  each household's **final snapshot only**, because cumulative facts appear in
  every later snapshot. Counting them across snapshots would inflate the totals; a
  regression test asserts the totals equal the final-state facts exactly.

Ingredients present in at least 80% of recipes are treated as household-level
staples and excluded from chainable reuse signals.

## Command validation scope

`applyKitchenCommand` validates structure, invariants and limits: week bounds,
positive quantities, supported units, sufficient stock, duplicate selections, week
ordering, and caps that mirror the Zod schema:

| Cap | Value |
| --- | --- |
| Single quantity | 1,000,000 |
| Grocery lines per receipt | 200 |
| Grocery facts | 5,000 |
| Consumption facts | 5,000 |
| Meal facts | 2,000 |
| Pantry rows | 200 |
| Skipped recipes per week | 50 |
| Substitution decisions per week | 50 |
| Weekly choice rows | 8 |

Exceeding a cap returns `limit_reached`, so any state reachable through commands is
guaranteed to be storable: actions cannot appear to succeed and then silently fail
to save.

The domain does not look up the catalog. Ingredient and recipe ids are validated
where they enter the system (onboarding against the catalog, and the catalog
loader itself), and intelligence tolerates unknown references by skipping them.
This keeps the domain free of catalog dependencies and makes restored or
hand-authored state impossible to crash on.

Two behaviours worth knowing:

- **Accepted substitutions apply everywhere.** Meal impact, meal cards, basket
  lines and the cooking commands all resolve requirements through
  `effectiveRequirement`, so a swap accepted in a week changes the card, the
  basket and what gets consumed together.
- **`optional: true` recipe ingredients are treated as required.** The flag is
  carried but never consulted by meal impact, basket or chains. The seed data
  contains one optional line; a future data author adding optional lines should
  decide how baskets should treat them.

## localStorage

Only the user-built household is persisted, under `blinkitchen:v2:kitchen`, with a
stable id of `local-kitchen`. The stored value is validated with Zod on read; an
invalid or outdated value is discarded and removed without crashing. Derived
intelligence is never stored. Simulated households are never stored; they are
regenerated deterministically.

## FUTURE DATA DIRECTION

Planned. None of this is implemented; it describes the target data foundation.
See [DATA_STRATEGY.md](DATA_STRATEGY.md) for the ingestion pipeline.

- **Ingredient aliases.** Canonical ingredients gain alias lists so recipe text
  such as "dahi", "curd" and "yogurt" resolves to one canonical ingredient.
- **Richer provenance.** Recipes carry source, source URL and ingestion
  provenance rather than a single source URL.
- **Richer recipe fields.** Yield and serving ranges, cooking time alongside
  preparation time, region, richer tags, and optional nutrition enrichment.
- **Household staple projection.** A derived, never-persisted view of what this
  household uses, buys and replenishes often, distinct from the catalog-level
  `staple` hint.
- **`usualIngredientIds` (potential stated fact).** "Ingredients this household
  normally keeps", kept deliberately separate from `pantry[]`, which is current
  physical stock. Adding it would require care: it is a stated fact, so it would
  belong in the profile, not in a new authority.
- **Optional ingredient semantics.** Optional lines should not block a recipe or
  become required purchases; required lines continue to affect coverage and the
  basket.
- **Target dataset scale.** 300 to 500 canonical ingredients, 300 to 500 validated
  recipes initially, growing to 800 to 1,500 high-quality recipes, 1,000 to 2,000
  simulated SKU variants and 50 to 150 substitution relationships.
- **Lightweight UI to profile mapping.** Simple choices such as "use what I have",
  "save money", "cook quickly" and "try new dishes" would map to the existing
  `planningPreference`, `priceSensitivity`, `conveniencePreference` and
  `explorationPreference` fields at the UI boundary. The domain keeps its current
  shape.
- **Lightweight pantry approximation.** "Low / some / plenty" would be translated
  to canonical quantities at the UI boundary before entering `KitchenState`.
  Approximation is a presentation concern, not a domain concept.
- **Diet model completion.** End-to-end support across profile, ingredients,
  recipes, ranking, substitutions and onboarding for all five diet preferences.
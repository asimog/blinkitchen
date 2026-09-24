# Data Model

## KitchenState — the single authority

```ts
type KitchenState = {
  id: string;
  profile: KitchenProfile;
  week: number;               // 1..8, bounded
  pantry: PantryItem[];       // current physical stock (fact)
  groceryFacts: GroceryFact[];       // append-only: what was received
  consumptionFacts: ConsumptionFact[]; // append-only: used | wasted
  mealFacts: MealFact[];             // append-only: meals completed
  weeklyChoices: WeeklyChoices[];    // explicit week-scoped user decisions
  createdAt?: string;         // set only by the storage/UI boundary
};
```

`PantryItem`:

```ts
type PantryItem = {
  ingredientId: string;   // canonical ingredient id
  quantity: number;       // >= 0, canonical units only
  unit: Unit;             // g | kg | ml | l | piece | packet
  useSoon: boolean;       // explicit household flag
  acquiredWeek: number;   // when it entered the kitchen (staleness evidence)
};
```

Facts are append-only and week-stamped:

```ts
type GroceryFact = { id; week; ingredientId; quantity; unit };
type ConsumptionFact = { id; week; ingredientId; quantity; unit; kind: "used" | "wasted" };
type MealFact = { id; week; recipeId; day; slot };
```

`WeeklyChoices` is the only channel for explicit user decisions:

```ts
type WeeklyChoices = {
  week: number;
  selectedMeals: {                  // optional breakfast, lunch and dinner slots
    day: WeekDay;
    slot: "breakfast" | "lunch" | "dinner";
    recipeId: string;
  }[];
  skippedRecipeIds: string[];       // dismissed recommendations
  substitutionDecisions: { substitutionId: string; accepted: boolean }[];
  completed: boolean;
};
```

Design note: the specification listed `recommendationFeedback` as a separate fact
array. It is folded into `weeklyChoices` because selected meals, skipped
recommendations and substitution decisions are all week-scoped explicit user
choices — one channel, no duplicate authority. `preferenceFacts` is omitted
entirely: stated preferences are profile facts; behavioural preference evidence is
*derived* from the other facts.

### What must never be persisted

Recommended meals, ranking scores, baskets, pantry coverage, ingredient chains,
substitutions, replenishments, explanations, learning summaries and Blinkit
insights. All of these are recomputed from facts + catalog on every render.

## Catalog — read-only

```ts
type Catalog = {
  ingredients: Ingredient[];
  recipes: Recipe[];
  products: Product[];        // expanded from templates × locations at load
  locations: Location[];
  substitutions: Substitution[];
};
```

- `Ingredient` carries canonical id, name, category, storage type, shelf life,
  dietary attributes and the units it supports.
- `Recipe` references canonical ingredients only — never SKUs. It has a Blinkit
  Recipes source URL, allowed breakfast/lunch/dinner slots, cuisine,
  servings, ingredients, dietary attributes, preparation complexity, minutes,
  discovery level and tags.
- `Product` references a canonical ingredient and a location; every product carries
  `simulated: true`.
- `Substitution` is an explicit directed relationship: requested ingredient →
  substitute ingredient, compatibility score, quantity ratio, cuisines, reason.
  Substitutions are never inferred from text similarity.

Seed sizes: ~27 ingredients, 14 recipes, 2 Delhi locations, ~28 temporary simulated
product templates expanded to ~56 SKUs, and 8 substitutions. Live Blinkit SKUs
and products are intentionally deferred; recipe provenance is captured separately.

## Derived projections

```ts
type WeekIntelligence = {
  week: number;
  learning: Learning;                     // deriveLearning(kitchen)
  recommendations: MealRecommendation[];  // ranked, each with explanations
  plan: PlannedMeal[];                    // effective plan (selected or suggested)
  planSource: "selected" | "suggested";
  basket: Basket;                         // pantry-aware, simulated prices
  chains: IngredientChain[];              // buy once, use across N meals
  useSoon: UseSoonOpportunity[];          // explicit flags + derived staleness
  substitutions: SubstitutionSuggestion[];
  replenishments: ReplenishmentSuggestion[];
  coverage: PantryCoverage;
  narrative: string[];                    // "what Blinkitchen learned this week"
};
```

`Learning` is a deterministic projection of facts: cuisine affinity, substitution
affinity per directed pair, price-sensitivity evidence, convenience evidence,
exploration tendency, frequently used ingredients, frequently wasted ingredients,
repeatedly cooked recipes.

```ts
type BlinkitInsights = {
  households: number;
  simulated: true;
  weeks: number;
  missingIngredients: { ingredientId; weeksMissing; shareOfRequirements }[];
  reusedIngredients: { ingredientId; appearances }[];
  useSoonFrequency: { ingredientId; occurrences }[];
  substitutionOutcomes: { substitutionId; accepted; rejected }[];
  replenishmentSignals: { ingredientId; households }[];
  cuisineSignals: { cuisine; meals }[];
  avoidedBasketValue: number;   // simulated ₹ covered by existing pantry
  archetypes: ArchetypeSummary[];
  narrative: string[];
};
```

`buildBlinkitInsights` is a read model. It cannot mutate kitchen state and never
becomes a data authority.

It receives **week snapshots** (the eight weekly states of each journey). Two
rules keep its numbers honest:

- Per-week projections (basket spend, coverage, missing/reuse/use-soon signals)
  are summed across snapshots, where each snapshot represents exactly one week.
- Recorded history (substitution decisions, meals, spoilage) is read from each
  household's **final snapshot only**, because the same facts appear
  cumulatively in every later snapshot. Counting them across snapshots would
  inflate the numbers several-fold; a regression test asserts the totals equal
  the final-state facts exactly.

## Units

Supported units: `g`, `kg`, `ml`, `l`, `piece`, `packet`. Normalization converts
`kg → g` and `l → ml` only. Cross-dimension conversion (for example pieces → grams)
is never inferred; incompatible quantities are simply not subtractable, and
intelligence reports the full requirement as missing. Pantry stock can never go
negative — `consume`/`waste` commands fail with a typed error code instead.

## Command validation scope

`applyKitchenCommand` validates **structure, invariants and limits**: week
bounds, positive quantities, supported units, sufficient stock, duplicate
selections, week ordering, and caps that mirror the Zod schema (quantity
≤ 1,000,000; ≤ 200 grocery lines; ≤ 5,000 grocery facts; ≤ 5,000 consumption
facts; ≤ 2,000 meal facts; ≤ 200 pantry rows; ≤ 50 weekly skips and
substitution decisions). Exceeding a cap returns `limit_reached`, so any state
reachable through commands is guaranteed to be storable — actions cannot appear
to succeed and then silently fail to save.

It does not look up the catalog: ingredient and recipe ids are validated where
they enter the system (onboarding against the catalog, and the catalog loader
itself), and intelligence tolerates unknown references by skipping them. This
keeps the domain free of catalog dependencies and makes restored or
hand-authored state impossible to crash on.

Two behaviours worth knowing:

- **Accepted substitutions apply everywhere.** Meal impact, meal cards, basket
  lines and the cooking commands all resolve requirements through
  `effectiveRequirement`, so a swap accepted in a week changes the card, the
  basket and what gets consumed together.
- **`optional: true` recipe ingredients are treated as required.** The seed
  dataset contains none; a future data author adding optional lines should
  decide how baskets should treat them.

## Scoring

Recipe ranking weights are centralized in one exported constant,
`MEAL_WEIGHTS` (`src/intelligence/meals.ts`):

```text
pantry fit 30% · cuisine fit 20% · ingredient reuse 15%
budget fit 15% · convenience 10% · use-soon benefit 10%
```

Factors are normalized to 0..1; household preferences shape the factors
(planning sharpens pantry fit and use-soon benefit, convenience sharpens
prep-time differences, exploration boosts discovery dishes) rather than adding
separate algorithms. Ranking penalties: skipped recommendations −0.25, meals
cooked in the last two weeks −0.08 each (capped at −0.16). Ties break on recipe
id, so ordering is total and deterministic.

## localStorage

Only the user-built household is persisted, under `blinkitchen:v2:kitchen`. The
stored value is validated with Zod on read; an invalid or outdated value is
discarded and removed without crashing. Derived intelligence is never stored.
Simulated households are never stored — they are regenerated deterministically.

# Data Model

Everything below is verified against the current code. Where behaviour is limiting
or incomplete, it is stated as a limitation rather than smoothed over. The code is
authoritative for exact field syntax; this document explains the contracts.

## KitchenState: the single authority

```ts
type KitchenState = {
  id: string;
  profile: KitchenProfile;
  week: number;                        // 1..8, bounded
  pantry: PantryItem[];                // current physical stock (fact)
  groceryFacts: GroceryFact[];         // append-only: what was received
  consumptionFacts: ConsumptionFact[]; // append-only: used | wasted
  mealFacts: MealFact[];               // append-only: meals completed
  weeklyChoices: WeeklyChoices[];      // explicit week-scoped household decisions
  createdAt?: string;                  // set only by the storage/UI boundary
};
```

`KitchenProfile` carries household facts: display name, member count, location,
weekly budget, diet, cuisines, cooking days per week, four 0..1 preference fields
(convenience, price, exploration, planning), kitchen type (`existing` or `fresh`)
and `starterIngredientIds` (intentions for a fresh kitchen, never stock). The type
supports five diets, but the catalog carries only `vegetarian` and `vegan`
attributes and onboarding offers only those two, so `eggetarian`,
`non_vegetarian` and `flexible` currently behave as "allow everything".
`PantryItem` is `{ ingredientId, quantity, unit, useSoon, acquiredWeek }`:
canonical id, non-negative quantity in a canonical unit, an explicit spoilage flag
and the week it entered the kitchen (staleness evidence).

Facts are append-only and week-stamped:

```ts
type GroceryFact     = { id; week; ingredientId; quantity; unit };
type ConsumptionFact = { id; week; ingredientId; quantity; unit; kind: "used" | "wasted" };
type MealFact        = { id; week; recipeId; day: WeekDay; slot: MealSlot };
```

Fact ids are derived from week, index and content, never from clocks.
`WeeklyChoices` is the only channel for explicit household decisions: selected
meals (day, slot, recipe), skipped recipe ids, substitution decisions
(substitution id, accepted) and whether the week is complete. The original
specification listed `recommendationFeedback` as a separate fact array; it is
folded in here because all three are week-scoped explicit choices — one channel,
no duplicate authority. `preferenceFacts` is omitted: stated preferences are
profile facts, and behavioural evidence is derived from the other facts.
Week intent: `WEEK_MIN 1`, `WEEK_MAX 8`, 7 days, meal slots
`breakfast | lunch | dinner`, at most 21 weekly meals, suggested plan size
`min(7, cookingDaysPerWeek)`.

## What must never be persisted

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
```

- **Ingredient**: `{ id; name; category; storageType; commonUnits; shelfLifeDays;
  staple; dietaryAttributes }`. Category is one of vegetables, dairy, protein,
  pantry, fat, spice; storage is perishable, shelf_stable or frozen. `shelfLifeDays`
  derives staleness and is never persisted. `staple` is a catalog-level "everyday
  staple" hint offered to fresh kitchens; it is not household state.
- **RecipeIngredient**: `{ ingredientId; quantity; unit; optional }`.
- **Recipe**: identity, source URL, cuisine, meal slots, servings, ingredients,
  dietary attributes, preparation complexity and minutes, `discoveryLevel`
  (`familiar` or `explore`) and tags.
- **Product**: `{ skuId; ingredientId; name; brand; packSize; unit; price;
  locationId; inventoryStatus; simulated: true }`; `simulated: true` is explicit
  provenance that these products are fictional.
- **Location**: `{ id; name; city; priceMultiplier; availabilityMultiplier }`.
- **Substitution**: an explicit, directed, curated relationship:
  `{ id; requestedIngredientId; substituteIngredientId; compatibilityScore;
  quantityRatio; cuisines; explanation }`. `compatibilityScore` is culinary
  plausibility (0..1), never inferred from text similarity; `quantityRatio` is
  substitute quantity per unit requested.

### Key invariants

- Recipes reference canonical ingredients, never SKUs. Products reference an
  ingredient and a location. The commerce layer decides how requirements map to
  packages.
- The catalog is read-only and is the only place recipes and products live.
- Substitutions are explicit, directed, curated relationships.
- The domain never looks up the catalog. Ingredient and recipe ids are validated
  where they enter the system (onboarding against the catalog, and the catalog
  loader itself); intelligence tolerates unknown references by skipping them, so
  restored or hand-authored state cannot crash the engine.
- Every command cap mirrors the Zod schema, so any state reachable through
  commands is guaranteed to be storable: actions cannot appear to succeed and then
  silently fail to save. Exact caps live in `src/domain/kitchen/schema.ts`.

### Current seed counts (verified)

| Item | Count |
| --- | --- |
| Canonical ingredients | 118 (24 flagged `staple`, 351 written-form aliases) |
| Ingredient categories | 6 (35 vegetables, 35 pantry, 25 spices, 12 protein, 7 dairy, 4 fats) |
| Storage split | 74 shelf stable, 42 perishable, 2 frozen |
| Shelf life range | 4 to 730 days |
| Recipes | 128 (110 familiar, 18 explore; 66 fully vegan) |
| Cuisines | 11 (54 north Indian, 20 Punjabi, 11 south Indian, 10 Indo-Chinese, 8 Italian, 5 each Gujarati/Maharashtrian/street food/continental, 4 Mughlai, 1 Mexican) |
| Recipes with optional ingredient lines | 40 recipes, 42 lines |
| Simulated product templates | 273 (136 brands, ₹14 to ₹1,100) |
| Locations | 2 (`delhi_south`, `delhi_central`) |
| Expanded SKU rows | 546 (273 templates × 2 locations) |
| Directed substitution relationships | 30 |
| Household fixtures | 4 |
| Journey length | 8 weeks |

**Provenance.** The canonical ingredient vocabulary, recipe structures and
simulated product facts were produced by an offline harvest of Blinkit Recipes
(`tools/catalog-harvest/`), normalised through the alias table, then hand-checked
against the schema. Ingredient quantities are approximate normalisations of the
published amounts (cup, teaspoon and piece conversions are documented ingestion
rules); they are good enough for basket reasoning, not for nutrition claims.
Instructions prose is never copied into the catalog. Prices are a snapshot of
simulated SKUs, not live data.

## Units

Supported units: `g`, `kg`, `ml`, `l`, `piece`, `packet`. Canonical units:
`g`, `ml`, `piece`, `packet`. Normalization converts `kg → g` and `l → ml` only.
Units belong to dimensions (mass, volume, piece, packet) and only same-dimension
quantities are comparable. Cross-dimension conversion (for example pieces to
grams) is never inferred: intelligence reports the full requirement as missing
rather than guessing. Pantry stock can never go negative; `consume` and `waste`
commands fail with a typed error code instead. Quantities round to two decimals.

## Derived projections

`WeekIntelligence` is the per-week read model: the derived `Learning`, ranked
`recommendations` with factors and impact, the effective `plan` and its
`suggestedPlan`, `planSource`, the `basket`, `chains`, `useSoon` opportunities,
`substitutions`, `replenishments`, `coverage` and a short `narrative`. `Learning`
holds cuisine affinity (0..1), substitution affinity (−1..1), derived price,
convenience and exploration evidence, frequent ingredients, wasted ingredients and
cooked recipes. Projection mechanics, all deterministic:

- **Meal impact** (`computeMealImpact`): per requirement line coverage is
  `min(1, owned / required)`; `coveragePercent` averages across lines. Cost is the
  simulated value of the missing quantities for that one meal.
- **Basket** (`buildBasket`): aggregate plan requirements by ingredient and
  canonical unit, subtract pantry stock, resolve the cheapest available simulated
  SKU for that unit, round up pack counts. Coverage is value-weighted
  (`coveredValue / requiredValue`); line status is `covered`, `buy` or
  `unavailable`.
- **Effective requirement** (`effectiveRequirement`): accepted substitutions
  replace the requested ingredient everywhere (meal impact, cards, basket and the
  simulation's cooking commands), scaled by `quantityRatio`.
- **Chains** (`findIngredientChains`): ingredients required by two or more planned
  meals, with ubiquitous ingredients (present in at least 60% of recipes) demoted
  so specific ingredients lead the story.
- **Use-soon** (`deriveUseSoon`): explicit `useSoon` flags plus staleness, where an
  item is stale once its age in weeks reaches `max(1, floor(shelfLifeDays / 7))`.
  Nothing is written back to the pantry.
- **Replenishment** (`recommendReplenishments`): consumption in the last 5 weeks,
  at least 2 recent weeks of use, weekly burn from recent quantities, remaining
  stock below 1.5 weeks of burn, and not already in the basket. Score is
  `0.6 × (recent weeks / 5) + 0.4 × (1 - min(1, weeksLeft / 1.5))`, capped at 5.
- **Substitutions** (`recommendSubstitutions`): only explicit catalog
  relationships, only for basket lines being bought, only when the substitute is
  diet-allowed and has a matching simulated SKU. Score is
  `0.6 × compatibility + 0.4 × affinity01`, plus 0.05 for a cuisine match, capped
  at 4. Affinity moves +1 per acceptance and −1 per rejection, clamped to −1..1.

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
- `budgetFit` = 1 − additionalCost / per-meal allowance, allowance =
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

**Plan-level selection.** `suggestPlan` no longer takes the top-ranked meals
unconditionally. A deterministic greedy planner (`src/intelligence/planner.ts`)
evaluates each remaining candidate against the partial week — pantry coverage,
actual cross-meal reuse, cuisine fit, convenience, incremental basket cost,
use-soon rescue and cuisine variety — and picks the marginally best meal one slot
at a time. `PLAN_WEIGHTS` in that file is the authoritative weight table. Every
planned meal carries one to three derived explanation sentences
(`explainPlannedMeal`). `rankRecipes` still produces the per-recipe ranking used
for the discovery list. There is deliberately no general optimiser.

## Optional ingredient lines

Required lines drive coverage, chains and the basket. Optional lines never block
a recipe and are never automatically purchased; they are excluded from
`computeMealImpact`, `buildBasket`, `findIngredientChains` and the simulation's
cooking commands. The catalog carries 42 optional lines across 40 recipes.

## BlinkitInsights

`buildBlinkitInsights` is a read model with explicit `simulated: true`. It cannot
mutate kitchen state and never becomes a data authority. It receives **week
snapshots** (the eight weekly states of each journey, 32 in total for four
fixtures) and reports recurring gaps, reused ingredients, use-soon frequency,
substitution outcomes, replenishment signals, cuisine signals, cumulative basket
spend, avoided basket value and per-archetype outcomes. Two rules keep its numbers
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

## localStorage

Only the user-built household is persisted, under `blinkitchen:v2:kitchen`, with a
stable id of `local-kitchen`. Zod validates the stored value on read; an invalid
or outdated value is discarded and removed without crashing. Derived intelligence
and simulated households are never stored.

## Future data direction

Planned. None of this is implemented. The execution plan is Phase 6 of
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

**The promise the data foundation exists to keep:** one canonical ingredient, one
normalised requirement, one comparable quantity. The catalog is a graph, not a
list:

```text
Recipe ──requires──> Canonical Ingredient <──packaged as── Product (SKU)
                            ▲
                   Substitution relationship
```

If ingredients are not canonical, pantry coverage, reuse, chaining, substitution
and pack resolution silently degrade into string matching. Quality dominates
volume: 1,000 well-normalized recipes are more useful than 50,000 dirty ones.
Aliases are data, not schema: `dahi · curd · yogurt` resolve to `yogurt` during
ingestion only, canonical ids stay stable and opaque, and ambiguous terms such as
"flour" stay unresolved unless explicitly mapped.

**Current versus target catalog** (directional, not contractual):

| Layer | Current | Target |
| --- | --- | --- |
| Canonical ingredients | 118, alias-aware | 300 to 500, alias-aware |
| Recipes | 128 with Blinkit Recipes provenance | 800 to 1,500 with full provenance |
| Cuisines | 11 | 15+, Delhi/NCR relevance first |
| Substitutions | 30 directed | 50 to 150 directed |
| Product templates | 273 | 400 to 800 |
| Simulated SKU variants | 546 | 1,000 to 2,000 |
| Locations | 2 | 5 to 15 across Delhi/NCR |

The MVP data milestone (118 ingredients, 128 recipes, 546 SKUs, 30 substitutions)
is met. Scale further only after the product loop is convincing: the next step is
roughly 300 ingredients, 800 recipes and 1,000 SKUs, not a jump to the full target.

**Offline ingestion.** Ingestion stays outside runtime Blinkitchen (see
[ARCHITECTURE.md](ARCHITECTURE.md)): it parses raw sources, resolves aliases,
normalizes units, validates against the schema, deduplicates and emits the
existing `Catalog` shape. Every recipe and substitution records source name,
source URL and ingestion provenance, so a questionable line can be audited without
re-ingesting. Prefer permissively licensed open datasets, then licensed APIs or
partnerships, then public factual data; never copy copyrighted recipe prose.
Nutrition data, if added, is optional enrichment that never influences ranking and
whose absence never breaks a surface.

**Model changes in the target direction:**

- **Diet model completion.** Back `eggetarian` and `non_vegetarian` with real
  catalog data and complete filtering end to end. Explicitly deferred for this
  MVP: the catalog intentionally covers vegetarian and vegan only.
- **Household staple projection.** A derived, never-persisted view of what this
  household uses, buys and replenishes often, distinct from the catalog `staple`
  hint. `usualIngredientIds` ("ingredients this household normally keeps") is a
  potential stated fact in the profile, deliberately separate from `pantry[]`.
- **"Low / some / plenty" pantry approximation.** Today quick picks create exact
  pack quantities; a coarser input would translate to canonical quantities at the
  UI boundary, not in the domain.
- **Ingestion hardening.** The harvest is a curated offline pipeline
  (`tools/catalog-harvest/`); a production ingestion service would add dedup
  review queues, source drift detection and richer provenance records.

Already delivered in this iteration: `Ingredient.aliases`, optional ingredient
semantics, cost-minimising whole-week pack selection (`planPackPurchase`), and the
priority-chip to profile mapping at the onboarding boundary (selected 0.8,
neutral 0.5, domain shape unchanged).

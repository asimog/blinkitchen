# Implementation Plan

The single future execution plan for Blinkitchen. It moves the prototype from its
current state to the target product direction in [PRODUCT_CASE.md](PRODUCT_CASE.md)
without changing the contracts in [ARCHITECTURE.md](ARCHITECTURE.md) or
[DATA_MODEL.md](DATA_MODEL.md) unless a phase explicitly says so.

Each phase states product behaviour, boundaries, files likely affected, acceptance
criteria, tests and sequencing. It avoids freezing internal APIs before they are
implemented: where a type or helper shape is not yet required, the requirement is
stated and the shape is decided during the phase.

## Constraints on every phase

Every phase obeys [AGENTS.md](AGENTS.md): one `KitchenState` authority, facts in
and intelligence out, no persisted projections, no new infrastructure or
dependencies without demonstrated product need, deterministic behaviour. Engine
complexity may grow; interface complexity must not. Every phase ends with
`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` and
`npm run test:e2e` when browser-facing behaviour changed. Authoritative docs are
updated in the same change, not afterwards.

## Baseline after the MVP iteration (verified)

| Area | Now |
| --- | --- |
| Onboarding | Three steps: Your household, How you eat (priority chips), Your kitchen (quick picks + optional search); no review step |
| Week view | Five blocks: Your kitchen this week → This week's plan → Your basket → Smart extras → What changed; detail behind "Why this?" |
| Meal selection | `rankRecipes` ranks for discovery; `suggestPlan` is a deterministic greedy planner evaluating each candidate against the partial week |
| Reuse signal | Per-recipe factor retained for ranking; plan-level cross-meal reuse uses actual committed requirements |
| Diet coverage | `DietPreference` has 5 values; catalog, filtering and onboarding intentionally cover 2 (deferred by scope) |
| Optional ingredients | Excluded from coverage, basket, chains and simulation cooking; never auto-bought |
| Catalog | 118 ingredients (351 aliases), 128 recipes, 273 templates, 546 SKUs, 30 substitutions, 11 cuisines, 42 optional lines |
| Data provenance | Offline harvest of Blinkit Recipes via `tools/catalog-harvest/`; generated fixtures committed; runtime never fetches |
| Week 1 → Week 8 | `compareJourney` projection + comparison panel on `/explore/[id]` with a jump link |
| Storage | `blinkitchen:v2:kitchen`, Zod-validated, facts only |
| Routes and CI | All six routes reachable; CI runs lint, typecheck, unit tests, build and a Playwright job over the critical routes |
| Tests | Unit suite across domain, catalog, intelligence, insights, simulation; Playwright desktop + mobile smoke |

Remaining known limitations: diets beyond vegetarian and vegan are unbacked
(deferred by explicit product scope); ingredient aliases are ingestion provenance
only; recipe quantities are approximate normalisations; whole-week pack reasoning
has no pantry-rescue heuristics beyond cost minimisation.

## Phase 0: repository hygiene — complete

Delivered: restored the missing `/build` route on the existing wizard shell so
every advertised route resolves; a reachability audit found no dead modules (the
onboarding stack was orphaned, not dead) and no clearly unused CSS selectors; docs
were consolidated to the six authoritative documents listed in
[README.md](README.md), with `PRODUCT_SCOPE.md` and `DATA_STRATEGY.md` merged and
deleted; `.kilo/skills` was pruned to the skills actually useful here; CI gained a
Playwright job; the full verification suite passes.

## Phase 1: copy honesty and reviewer path — complete

The homepage now leads with "See the 8-week demo" (primary), "Build your kitchen"
(secondary) and "Blinkit Lens" (tertiary); the hero is one sentence; the sections
that repeated the product case are gone and only the derived Week 1 preview and a
compact evidence strip remain. The overstating reuse claim was replaced with the
plan-level truth. Replenishment copy leads with the outcome, substitutions lead
with household history instead of a compatibility percentage, the basket narrative
says "already at home", meal factors sit behind "Why this?", and the learning
panel leads with two statements. `src/intelligence/copy.test.ts` guards every
customer-facing explanation string (plus the Week 1 to Week 8 comparison) against
internal vocabulary.

## Phase 2: three-step onboarding — complete

```text
STEP 1  YOUR HOUSEHOLD   size, diet, location, approximate weekly budget
STEP 2  HOW YOU EAT      cuisines, cooking frequency, up to 2 priority chips
STEP 3  YOUR KITCHEN     quick-pick groups (pantry basics, fresh basics,
                         regularly bought), optional search/add, or start empty
                         ↓
                    START WEEK 1
```

No review step and no abstract sliders. The pure mapping lives in
`src/components/onboarding/onboarding-prefs.ts`: priority chips set the existing
profile fields at the UI boundary (selected 0.8, neutral 0.5), cooking frequency
maps to `cookingDaysPerWeek`, and quick picks resolve one typical pack per
ingredient from the catalog's own products. Unit tests cover determinism, schema
validity, chip mapping and pack derivation; the e2e helper and wizard assertions
run the three-step flow. Diet options remain vegetarian and vegan only.

## Phase 3: week-view simplification — complete

`WeekView` now renders the five target blocks in order:

```text
YOUR KITCHEN THIS WEEK     state summary, use-first line, pantry detail
        ↓
THIS WEEK'S PLAN           up to 5 planned meals, each explained and actionable
        ↓
YOUR BASKET                what to buy and what is already at home
        ↓
SMART EXTRAS               chains, swaps and replenishment in one grouped panel
        ↓
WHAT CHANGED               two statements, full learning behind a toggle
```

Meal cards lead with name, additional cost, "% already home" and two reasons;
ingredients and fit factors sit behind "Why this?". The ranked discovery list and
the scoring weights moved into disclosure. All accessible landmarks
(`dl[aria-label="This week at a glance"]`, "Pantry-aware basket", "Ingredient
chaining", "What Blinkitchen learned", the week rail) are preserved for screen
readers and browser tests.

## Phase 4: Week 1 to Week 8 comparison — complete

`compareJourney(kitchens, catalog)` is a pure, deterministic projection in
`src/intelligence/journey.ts`. It reports six signals (meals recorded, plan
already at home, shared ingredients, substitution decisions, recorded waste,
cumulative groceries avoided) with Week 1 and Week 8 values, plus "what the
system knew" and "what it learned" highlights. `JourneyComparisonPanel` renders
it on `/explore/[id]` under an anchor link in the journey bar
(`id="journey-comparison"`); weekly detail remains available by drill-down.
Covered by determinism, read-only and household-difference tests.

## Phase 5: plan-level intelligence — complete

`suggestPlan` is now a deterministic greedy planner
(`src/intelligence/planner.ts`): each remaining candidate is evaluated against the
partial week on pantry coverage, actual cross-meal reuse (against committed
requirements, not the corpus), cuisine fit, convenience, incremental basket cost,
use-soon rescue and cuisine variety, with `PLAN_WEIGHTS` as the authoritative
table and stable recipe-id tie-breaking. Every planned meal carries one to three
derived explanation sentences. `rankRecipes` still powers the discovery list.
`planner.test.ts` proves the weights balance, determinism, reuse rewards, pantry
effects and use-soon rescue; `simulation.test.ts` proves the four archetypes still
diverge for their stated reasons. No general optimiser was introduced.

## Phase 6: catalog, diet, optional-ingredient and ingestion foundation — delivered (diet deferred)

Delivered:

- **Optional ingredients.** Required lines drive coverage and the basket; optional
  lines never block a recipe, never enter the basket or chains, and are skipped by
  the simulation's cooking commands and the interactive cook action. The
  interactive basket also pins the suggested plan before receiving it, so the
  plan cannot change between buying and cooking.
- **Aliases.** `Ingredient.aliases: string[]` is part of the catalog schema
  (351 written forms across 118 ingredients). Aliases are ingestion provenance:
  resolved offline, never read at runtime, canonical ids unchanged.
- **Offline ingestion.** `tools/catalog-harvest/` is the ingestion boundary:
  `harvest.mjs` collects Blinkit Recipes pages and product facts,
  `generate.mjs` maps written forms to canonical ids, normalises quantities and
  packs, validates nothing at runtime, and emits the committed
  `src/data/*.json`. Instruction prose is never copied.
- **Catalog scale.** 118 canonical ingredients, 128 recipes (11 cuisines,
  18 explore-level, 66 vegan), 273 product templates (546 SKUs), 30 directed
  substitutions. Scale is capped at the MVP milestone; the next step is roughly
  300 ingredients / 800 recipes / 1,000 SKUs.
- **Whole-week pack reasoning.** `planPackPurchase` evaluates every in-stock pack
  in the required dimension and picks the lowest total cost, tie-breaking on fewer
  packs. The repair step in `buildCatalog` guarantees every ingredient is
  purchasable per location *and per pack dimension*.

Deferred by explicit product scope for this MVP: diets beyond vegetarian and
vegan. The catalog intentionally covers only those two; `eggetarian`,
`non_vegetarian` and `flexible` still behave as "allow everything", and onboarding
does not offer them. No diet is exposed that the data cannot support.

## Phase 7: measurement readiness — complete

`PRODUCT_CASE.md` now defines one event per primary metric (trigger and key
properties) for a real deployment, and states explicitly that the prototype stays
uninstrumented. Onboarding completion, correction burden and pantry coverage are
called out as first-class signals rather than vanity numbers.

## Test strategy

- **Domain first.** New intelligence behaviour needs a test proving household
  behaviour changes the output, not just that the function runs.
- **Determinism.** Every new projection gets a two-run deep-equal test.
- **Contracts.** Schema changes come with schema tests (valid and invalid
  payloads) before UI work.
- **Copy.** A short banned-vocabulary test guards customer-facing explanation
  strings.
- **Browser.** Keep the desktop journey suite and the mobile smoke suite, and keep
  CI running them. Update landmarks deliberately; never delete an assertion to
  make a restructure pass.
- **Accessibility.** Focus-visible contrast, `aria-current` on navigation, keyboard
  operability for the week rail, and `details`/`summary` for disclosure.

## Landmark obligations

These accessible landmarks are load-bearing for tests and screen readers.
Preserve them, or update the corresponding assertion in the same change with a
stated reason.

| Landmark | Phase | Action |
| --- | --- | --- |
| `dl[aria-label="This week at a glance"]` with four pairs | 3 | Preserve, restyle as a summary line |
| `section[aria-label="Your week, step by step"]` | 3 | Preserve |
| `section[aria-label="Recommended meals"]`, `"Pantry-aware basket"`, `"What you already have"` | 3 | Preserve; pantry may move into a drill-down |
| `section[aria-label="Suggested swaps"]`, `"Ingredient chaining"`, `"Replenishment prompts"` | 3 | Preserve as sub-regions inside Smart Extras |
| Week rail buttons `W1..W8` and the exact string `Week N of 8` | all | Exactly one match |
| Mobile: basket table hidden, list visible | 3 | Preserve |
| Focus ring colour token | all | Preserve |

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Three-step onboarding drops signals the engine uses | Weak Week 1 | Mapping table plus pack-size defaults; test differentiation across households |
| `cuisines` schema requires at least one | Step 2 cannot be skipped | Decide explicitly: keep required, or relax with a documented neutral prior |
| Plan-level planner changes archetype outcomes | Simulation story shifts | Keep differences emergent; test the stated reasons, never tune thresholds to force them |
| Merging extras hides mechanics reviewers want | Weakened explainability | Keep each sub-region accessible and expandable |
| Diet extension changes existing filtering | Fixture behaviour shift | All four fixtures are vegetarian; add explicit tests for new diets |
| Alias additions mutate canonical ids | Breaks every join | Aliases are additive; canonical ids are stable by contract |
| Copy test becomes brittle | Friction | Keep the banned list short, intentional and documented |

## Sequencing and status

```text
Phase 0  hygiene                     complete
Phase 1  copy + reviewer path        complete
Phase 2  three-step onboarding       complete
Phase 3  week hierarchy              complete
Phase 4  Week 1 → Week 8 comparison  complete
Phase 5  plan-level intelligence     complete
Phase 6  catalog / optional / aliases / ingestion   delivered (diet deferred by scope)
Phase 7  measurement readiness       complete (definitions in PRODUCT_CASE.md)
```

## Progress tracker

| Phase | Status |
| --- | --- |
| 0. Repository hygiene | Complete |
| 1. Copy honesty and reviewer path | Complete |
| 2. Three-step onboarding | Complete |
| 3. Week view hierarchy | Complete |
| 4. Week 1 to Week 8 comparison | Complete |
| 5. Plan-level intelligence | Complete |
| 6. Catalog, optional, aliases, ingestion | Delivered; diet deferred by scope |
| 7. Measurement readiness | Complete |

## Post-MVP work, in order

1. **Diet model completion.** Extend catalog data to eggetarian and
   non_vegetarian, then filtering, ranking, substitutions and onboarding end to
   end. Do not expose a diet until its data exists. Deferred by explicit scope.
2. **Data scale.** Grow toward 300 ingredients, 800 recipes and 1,000 SKUs through
   the harvest pipeline, quality first.
3. **Pilot instrumentation.** Implement the event definitions in
   [PRODUCT_CASE.md](PRODUCT_CASE.md) in a real deployment; the prototype stays
   uninstrumented.
4. **Optional ingredient refinement.** Decide whether optional lines should be
   consumed (and use-soon rescued) when the household already owns them.
5. **Pantry input ergonomics.** Test presence-plus-typical-pack against
   "low / some / plenty" with real households.

## Non-goals

The product-level non-goals in [ARCHITECTURE.md](ARCHITECTURE.md) apply unchanged.
Two are specific to this plan: no general optimisation framework (a deterministic
greedy planner is the intended ceiling), and no new planning or specification
documents — this file is the plan.

## Open questions

These need product or usability evidence, not assumptions:

1. Must cuisine be selected in onboarding, or is it optional with a neutral
   prior? The current wizard keeps it required; real completion data decides
   whether to relax the schema.
2. Is presence plus a typical pack size enough for pantry input, or is
   "low / some / plenty" worth the translation complexity?
3. How much pantry correction burden is acceptable before a household abandons
   inferred state? This bounds how aggressive learning may be.
4. Should optional ingredient lines count toward coverage, and be rescued, when
   the household already owns them?

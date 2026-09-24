# Implementation Plan

Plan for moving Blinkitchen from its current prototype to the target product
direction described in [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md) and
[PRODUCT_CASE.md](PRODUCT_CASE.md).

Nothing in this document is implemented. It is a plan for future code work; the
document itself is Markdown only. Executing it must not change the contracts in
[ARCHITECTURE.md](ARCHITECTURE.md) or [DATA_MODEL.md](DATA_MODEL.md) unless a
phase below explicitly says so.

## Constraints on every phase

Every phase obeys the repository rules in [AGENTS.md](AGENTS.md): one
`KitchenState` authority, facts in and intelligence out, no persisted
projections, no new infrastructure or dependencies without demonstrated product
need, and deterministic behaviour. Engine complexity may grow; interface
complexity must not.

Every phase ends with `npm run lint`, `npm run typecheck`, `npm run test`,
`npm run build`, and `npm run test:e2e` when browser-facing behaviour changed.
Authoritative docs are updated in the same change, not afterwards.

## 1. Baseline

Verified against `main` at the time of writing:

| Area | Current |
| --- | --- |
| Onboarding | 5 steps: Household, Food preferences, Kitchen and pantry, Cooking routine, Review |
| Week view | Journey bar, week header, KPI strip, checklist, pantry, planner, ranked meals, scoring details, chains, basket, swaps, replenishment, learning, narrative |
| Meal selection | `rankRecipes` scores meals individually; `suggestPlan` takes the top meals by rank |
| Reuse signal | `MealFactors.ingredientReuse` from ingredient occurrence in the recipe corpus |
| Diet coverage | `DietPreference` has 5 values; catalog attributes and onboarding cover 2 |
| Optional ingredients | `RecipeRequirement.optional` is carried but never consulted |
| Catalog | 43 ingredients, 14 recipes, 46 templates, 92 SKUs, 8 substitutions, 2 locations |
| Storage | `blinkitchen:v2:kitchen`, Zod-validated, facts only |
| Tests | 125 unit tests, 12 Playwright tests |

## 2. Contracts that change

| Contract | Current | Target | Phase |
| --- | --- | --- | --- |
| Onboarding steps (UI only) | 5 | 3 | 2 |
| `KitchenProfile` fields | unchanged shape | unchanged; priorities map into existing 0..1 fields at the UI boundary | 2 |
| `KitchenProfile.cuisines` | schema requires at least 1 | decision needed: keep required, or allow empty with a neutral affinity prior | 2 |
| `MealFactors.ingredientReuse` | corpus reuse potential | plan-level reuse measured against the partial week (proposed rename `planReuse`) | 5 |
| `PlannedMeal` | `recipeId, recipe, source, day, slot` | adds `utility: number` and `reasons: string[]` | 5 |
| `WeekIntelligence` | unchanged shape | may add `planNotes: string[]`; no removals | 5 |
| New projection | none | `JourneyComparison` from `compareJourney(states, catalog)` | 4 |
| `DietaryAttribute` | `vegetarian \| vegan` | adds `eggetarian` and `non_vegetarian` data support | 6 |
| `RecipeRequirement.optional` | ignored | required lines drive coverage and basket; optional lines never block or auto-buy | 6 |
| `Ingredient` | no aliases | adds `aliases: string[]` (additive) | 6 |

Rules that still hold: recipes reference canonical ingredients, never SKUs; the
catalog stays read-only; nothing derived is persisted.

## 3. Phases

### Phase 0: copy honesty and restraint

Goal: the interface stops narrating the engine and stops overstating what the
engine does.

| # | Change | Files | Size |
| --- | --- | --- | --- |
| 0.1 | Replace the home reuse claim ("chaining shapes which dishes rank highest") with an accurate statement about shared ingredients across the plan | `src/app/page.tsx` | S |
| 0.2 | Replace "Derived from your consumption history, not guesswork" with outcome copy: "You use this often and you're running low." | `src/components/kitchen/ReplenishmentPanel.tsx` | S |
| 0.3 | Replace "Explicit ingredient relationships, no guessing" with plain language about why the swap is offered | `src/components/kitchen/SubstitutionPanel.tsx` | S |
| 0.4 | Drop "Compatibility 84%" from swap bullets; lead with "You've accepted this swap before" | `src/intelligence/explanations.ts` | S |
| 0.5 | Rewrite the cuisine narrative from "strongest cuisine signal, affinity 62%" to a concrete statement about what the household cooks | `src/intelligence/index.ts` | S |
| 0.6 | Basket narrative uses "already at home" and drops "basket value" phrasing on customer surfaces | `src/intelligence/index.ts`, `src/components/kitchen/BasketPanel.tsx` | S |
| 0.7 | Move the meal factor line (pantry 53 / cuisine 50 / reuse 40) behind "Why this?" | `src/components/kitchen/MealCard.tsx`, `WeekView.tsx` | S |
| 0.8 | Learning panel leads with 1 to 2 concrete statements; affinity bars move behind expansion | `src/components/kitchen/LearningPanel.tsx` | M |
| 0.9 | Basket hint says "6 things to buy", not "28 of 29 lines to buy" | `src/components/kitchen/BasketPanel.tsx` | S |
| 0.10 | Disclosure: one page or section label per surface; stop repeating "simulated" beside every value, keep provenance where omission would mislead | `MetricRow.tsx`, `BasketPanel.tsx`, `blinkit/BlinkitLens.tsx` | M |
| 0.11 | Trim panel hints to one line where the heading already says it | `src/components/kitchen/*` | S |

Actions:

- Add a copy guard test: explanation strings on customer surfaces must not contain
  internal vocabulary (`affinity`, `compatibility`, `utility`, `factor`,
  `corpus`). Keep the banned list short and deliberate.
- Acceptance: every customer-facing sentence describes an outcome a household
  would recognise, and no sentence claims plan-level optimisation.
- Docs: none (copy only).

### Phase 1: reviewer path

Goal: a Blinkit reviewer reaches the strongest demonstration in two clicks.

| # | Change | Files | Size |
| --- | --- | --- | --- |
| 1.1 | Primary home CTA becomes "See the 8-week demo" to `/explore/pantry_planner`; secondary "Build your kitchen"; tertiary Blinkit lens | `src/app/page.tsx` | S |
| 1.2 | Keep the derived Week 1 preview as the product signal next to the thesis | `src/app/page.tsx` | S |
| 1.3 | Restructure the Blinkit Lens into four layers: the opportunity, what the prototype demonstrates, what this could enable, how I would test it | `src/components/blinkit/BlinkitLens.tsx` | M |
| 1.4 | Keep the three layers visibly separate: demonstrated mechanics, Blinkit hypotheses, what must be tested | `BlinkitLens.tsx` | M |
| 1.5 | Move cohort tables and secondary metrics below the four layers or behind expansion | `BlinkitLens.tsx`, `blinkit.module.css` | M |

- Acceptance: from `/`, a reviewer can open the demo and reach Week 8 without
  onboarding, and the Blinkit Lens never mixes hypothesis with demonstration.
- Docs: `README.md` demo path if labels change.

### Phase 2: three-step onboarding

Goal: enough signal for a useful Week 1, in about a minute, with no inventory
precision.

| # | Change | Files | Size |
| --- | --- | --- | --- |
| 2.1 | Step 1 "Your Household": size, diet, location, budget. Naming optional, prefilled "My Kitchen" | `BuildWizard.tsx` | M |
| 2.2 | Step 2 "How You Eat": cuisines, cooking frequency, up to 2 priorities | `BuildWizard.tsx` + new pure helper `src/components/onboarding/profile-mapping.ts` | M |
| 2.3 | Step 3 "Your Kitchen": quick-pick groups plus optional search and add plus "start mostly empty" | `BuildWizard.tsx` | M |
| 2.4 | Quick picks set one typical pack size per ingredient using the existing simulated catalog lookup, not invented multipliers | onboarding helper | M |
| 2.5 | Remove the review step and delete the four preference sliders | `BuildWizard.tsx` | S |
| 2.6 | Priority chips map to existing fields: Use what I have → `planningPreference`, Save money → `priceSensitivity`, Cook quickly → `conveniencePreference`, Try new dishes → `explorationPreference` | `profile-mapping.ts` | S |
| 2.7 | Keep diet options at vegetarian and vegan until Phase 6 lands; never offer a diet the data cannot support | `BuildWizard.tsx` | S |
| 2.8 | Update the e2e wizard helper and any step-count assertions | `e2e/helpers.ts`, `e2e/journey.spec.ts` | S |

- Acceptance: a household reaches Week 1 in three steps, no step needs an
  explanation, and no step requires understanding the engine.
- Tests: unit tests prove the mapping is deterministic, produces schema-valid
  profiles, and never yields an empty cuisine list (or, if cuisines become
  optional, yields the documented neutral prior).
- Risk: dropping sliders and exact pantry rows removes signals the engine uses.
  Mitigation: mapping table plus pack-size defaults; verify Week 1 output still
  differentiates households.
- Docs: `PRODUCT_SCOPE.md` (limitation removed), `ARCHITECTURE.md` module map,
  `DATA_MODEL.md` if the cuisine schema decision changes the profile contract.

### Phase 3: week view hierarchy

Goal: one primary question and one obvious next action per screen, with mechanics
behind disclosure.

```text
YOUR KITCHEN THIS WEEK     one state summary and what to use first
        ↓
THIS WEEK'S PLAN           3 to 5 meal choices, each with one action
        ↓
YOUR BASKET                what to buy and what is already at home
        ↓
SMART EXTRAS               use soon, swap, restock
        ↓
WHAT CHANGED               1 to 2 learning statements
```

| # | Change | Files | Size |
| --- | --- | --- | --- |
| 3.1 | Restructure `WeekView` into the five blocks, keeping the journey bar and week header | `WeekView.tsx` | M |
| 3.2 | The KPI strip becomes one supporting summary line; the accessible `dl` with its four pairs stays | `MetricRow.tsx`, `kitchen.module.css` | M |
| 3.3 | Meal cards lead with name, share already at home, incremental cost, one or two reasons, action; scoring behind "Why this?" | `MealCard.tsx` | M |
| 3.4 | Basket headline becomes "6 things to buy, ₹620, ₹280 already at home", then the grouped list | `BasketPanel.tsx` | M |
| 3.5 | Chains, swaps and replenishment become compact rows inside one Smart Extras panel, keeping each as an accessible sub-region | new `SmartExtras.tsx`, existing row components | L |
| 3.6 | Learning panel: 1 to 2 statements, values behind expansion | `LearningPanel.tsx` | M |
| 3.7 | Pantry and the week planner become drill-down views, with a "what's home" line kept in the summary | `PantrySnapshot.tsx`, `WeekMealPlanner.tsx` | M |
| 3.8 | Update browser tests for the new structure without weakening behavioural assertions | `e2e/journey.spec.ts`, `e2e/smoke.mobile.spec.ts` | M |

- Acceptance: a first-time viewer answers "what do I cook and what do I buy"
  without expanding anything, and every visible panel earns its place.
- Docs: `PRODUCT_SCOPE.md` (limitation removed), `AGENTS.md` unchanged.

### Phase 4: Week 1 to Week 8 comparison

Goal: make the longitudinal claim visible on one screen.

| # | Change | Files | Size |
| --- | --- | --- | --- |
| 4.1 | New pure projection `compareJourney(states, catalog): JourneyComparison`, derived only | `src/intelligence/compare.ts`, `src/intelligence/index.ts` | M |
| 4.2 | Comparison surface: what Week 1 knew versus what Week 8 learned (recurring ingredients, cuisine behaviour, swap preferences, waste, replenishment) | new `src/components/explore/JourneyCompare.tsx` | M |
| 4.3 | Jump link from the journey bar and a closing callout on `/explore` | `JourneyBar.tsx`, `src/app/explore/page.tsx` | S |
| 4.4 | Determinism and archetype-difference tests for the new projection | new test file | M |

- Acceptance: a reviewer describes what changed between Week 1 and Week 8 in under
  a minute from one screen, with no invented outcome text.
- Docs: `DATA_MODEL.md` (projection), `SIMULATION.md` (replace the planned
  section), `README.md` demo path.

### Phase 5: plan-level intelligence

Goal: reuse becomes real cross-meal reuse, chosen against the partial week.

| # | Change | Files | Size |
| --- | --- | --- | --- |
| 5.1 | New pure planner: slot-by-slot greedy selection with an inspectable utility function | `src/intelligence/planner.ts` | L |
| 5.2 | Utility inputs: household fit, pantry coverage, incremental basket cost, actual cross-meal reuse, use-soon rescue, budget fit, convenience, variety, recent repetition | `planner.ts`, `meals.ts` | M |
| 5.3 | Weights centralized and documented, alongside `MEAL_WEIGHTS` | `planner.ts` | S |
| 5.4 | `ingredientReuse` becomes plan-aware. Proposed rename `planReuse` with the corpus signal retired; keep `rankRecipes` for the discovery list only | `meals.ts`, `intelligence/types.ts`, `MealCard.tsx` | M |
| 5.5 | `PlannedMeal` gains `utility` and `reasons`; the plan explains each pick in one sentence | `intelligence/types.ts`, `planner.ts`, `WeekView.tsx` | M |
| 5.6 | Stable tie-break by recipe id; no randomness anywhere | `planner.ts` | S |
| 5.7 | Tests: sharing changes selection, budget changes selection, use-soon rescue changes selection, same inputs give identical plans, archetype differences persist | `src/intelligence/planner.test.ts`, `simulation.test.ts` | L |

- Acceptance: tests prove household behaviour changes the plan, not just the
  ranking; every planned meal can be explained in one sentence; the four fixtures
  still diverge for their stated reasons rather than by tuning.
- Terminology after this phase: meal-level chain potential (candidate signal),
  plan-level cross-meal reuse (selection outcome). Never call it week
  optimisation unless a solver is genuinely introduced, which it should not be.
- Docs: `DATA_MODEL.md` (weights, fields, semantics), `ARCHITECTURE.md` and
  `PRODUCT_SCOPE.md` (limitations removed), `SIMULATION.md` if policy inputs
  change.

### Phase 6: catalog, diet and optional-ingredient completeness

Goal: make the data credible at a larger scale without touching runtime
architecture. Can run in parallel with Phases 3 to 5.

| # | Change | Files | Size |
| --- | --- | --- | --- |
| 6.1 | Extend `DietaryAttribute` and the schema; add real data behind eggetarian and non_vegetarian | `src/catalog/types.ts`, `schema.ts`, `src/data/*` | M |
| 6.2 | Complete diet filtering end to end: profile, ingredients, recipes, ranking, substitutions, onboarding | `src/intelligence/diet.ts`, `BuildWizard.tsx` | M |
| 6.3 | Define optional-ingredient semantics: required drives coverage and basket; optional never blocks and never auto-buys | `meals.ts`, `basket.ts`, `chains.ts` | M |
| 6.4 | Add `aliases: string[]` to ingredients (additive) and resolve aliases during ingestion only | `catalog/types.ts`, `schema.ts`, `load.ts` | M |
| 6.5 | Offline ingestion pipeline per `DATA_STRATEGY.md`, producing the existing catalog shape | separate offline workstream | L |
| 6.6 | Grow the catalog to the target ranges, quality first | `src/data/*` | L |
| 6.7 | Tests: every diet filters correctly, optional lines never become required, aliases never change canonical ids | catalog and intelligence tests | M |

- Acceptance: the catalog can absorb new sources without runtime code changes,
  and no recipe line depends on string matching.
- Docs: `DATA_MODEL.md` (move future items to current), `DATA_STRATEGY.md`
  current-versus-target table, `PRODUCT_SCOPE.md` limitations removed.

### Phase 7: measurement readiness

Goal: make a real pilot measurable without adding tracking to the prototype.

| # | Change | Files | Size |
| --- | --- | --- | --- |
| 7.1 | Event definitions for every metric in `PRODUCT_CASE.md`, with name, trigger, properties and source | this document, `PRODUCT_CASE.md` | M |
| 7.2 | Explicit statement that the prototype stays uninstrumented | `PRODUCT_CASE.md` | S |
| 7.3 | Onboarding completion, correction burden and pantry coverage treated as first-class signals | `PRODUCT_CASE.md` | S |

Proposed event definitions to refine:

| Event | Trigger | Key properties |
| --- | --- | --- |
| `onboarding_step_completed` | each step submitted | step index, elapsed seconds |
| `onboarding_completed` | Week 1 rendered | household size, diet, budget band |
| `plan_meal_accepted` | meal added to plan | recipe id, plan source |
| `plan_meal_dismissed` | recommendation dismissed | recipe id, reason if offered |
| `basket_line_added` | basket line confirmed | ingredient id, status, line cost |
| `swap_decided` | swap accepted or rejected | substitution id, decision, score band |
| `replenishment_prompt_decided` | prompt accepted or dismissed | ingredient id, remaining band |
| `pantry_corrected` | pantry edited after inference | ingredient id, direction |
| `week_completed` | week closed | week, coverage percent, to-buy count |
| `journey_returned` | next weekly session | days since previous |

- Acceptance: every metric in the product case has a definition and a stated data
  source for a real deployment.
- Docs: `PRODUCT_CASE.md`.

## 4. Test strategy

- **Domain first.** New intelligence behaviour needs a test proving household
  behaviour changes the output, not just that the function runs.
- **Determinism.** Every new projection gets a two-run deep-equal test.
- **Contracts.** Schema changes come with schema tests (valid and invalid
  payloads) before UI work.
- **Copy.** A short banned-vocabulary test guards customer-facing explanation
  strings.
- **Browser.** Keep the desktop journey suite and the mobile smoke suite. Update
  landmarks deliberately; never delete an assertion to make a restructure pass.
- **Accessibility.** Focus-visible contrast, `aria-current` on navigation, keyboard
  operability for the week rail, and `details`/`summary` for disclosure.

## 5. Landmark obligations

These accessible landmarks are load-bearing for tests and for screen readers.
Preserve them, or update the corresponding assertion in the same change with a
stated reason.

| Landmark | Phase | Action |
| --- | --- | --- |
| `dl[aria-label="This week at a glance"]` with four pairs | 3 | Preserve, restyle as a summary line |
| `section[aria-label="Your week, step by step"]` | 3 | Preserve |
| `section[aria-label="Recommended meals"]` | 3 | Preserve |
| `section[aria-label="Pantry-aware basket"]` | 3 | Preserve |
| `section[aria-label="What you already have"]` | 3 | Preserve inside the drill-down |
| `section[aria-label="Suggested swaps"]`, `"Ingredient chaining"`, `"Replenishment prompts"` | 3 | Preserve as sub-regions inside Smart Extras |
| Week rail buttons `W1..W8` and the single exact string `Week N of 8` | all | Preserve exactly one match |
| Mobile: basket table hidden, list visible | 3 | Preserve |
| Focus ring colour token | all | Preserve the token contract |

## 6. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Three-step onboarding drops signals the engine uses | Weak Week 1 | Mapping table plus pack-size defaults; verify differentiation across households in tests |
| `cuisines` schema requires at least one | Step 2 cannot be skipped | Decide explicitly: keep required, or relax the schema with a documented neutral prior |
| Plan-level planner changes archetype outcomes | Simulation story shifts | Keep differences emergent; add tests for the stated reasons, never tune thresholds to force them |
| Merging extras into one panel hides mechanics reviewers want | Weakened explainability | Keep each sub-region accessible and expandable |
| Demoting pantry and planner hides facts | Reviewer confusion | Keep one "what's home" line in the week summary |
| Diet extension changes existing filtering | Fixture behaviour shift | All four fixtures are vegetarian; add explicit tests for the new diets |
| Alias additions mutate canonical ids | Breaks every join | Aliases are additive; canonical ids are stable by contract |
| Copy test becomes brittle | Friction | Keep the banned list short, intentional and documented |

## 7. Sequencing

```text
Phase 0  copy honesty ─────────────┐
                                   ↓
Phase 1  reviewer path ──→ Phase 3  week hierarchy ──→ Phase 4  comparison
                                   │                        │
Phase 2  onboarding ───────────────┤                        │
                                   ↓                        ↓
Phase 5  plan-level intelligence ──→ (copy and plan claims freeze)
                                   ↓
Phase 6  catalog, diet, optional (parallel with 3 to 5)
                                   ↓
Phase 7  measurement readiness
```

Phase 0 and Phase 1 are independent and cheap. Phase 2 and Phase 3 can proceed in
parallel after Phase 1. Phase 4 depends on a stable week hierarchy. Phase 5 should
land before final copy freezes, because it changes what the plan can claim.

## 8. Progress tracker

| Phase | Status |
| --- | --- |
| 0. Copy honesty and restraint | Not started |
| 1. Reviewer path | Not started |
| 2. Three-step onboarding | Not started |
| 3. Week view hierarchy | Not started |
| 4. Week 1 to Week 8 comparison | Not started |
| 5. Plan-level intelligence | Not started |
| 6. Catalog, diet, optional completeness | Not started |
| 7. Measurement readiness | Not started |

## 9. Non-goals

The product-level non-goals in [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md) apply here
unchanged: no checkout, accounts, databases, queues, runtime LLMs, embeddings,
vector databases, persisted projections, real Blinkit data or operations
dashboard. Two are specific to this plan:

- No general optimisation framework. A deterministic greedy planner is the
  intended ceiling.
- No new planning or specification documents; this file is the plan.

## 10. Open questions

These need product or usability evidence, not assumptions:

1. Are cuisines required in onboarding, or optional with a neutral affinity prior?
   This decides whether the profile schema changes.
2. Is approximate quantity capture (low, some, plenty) worth the translation
   complexity, or is presence plus a typical pack size enough for Week 1?
3. Should the Week 1 to Week 8 comparison be a section on the journey page or its
   own route in the reviewer path?
4. How much correction burden is acceptable before a household abandons inferred
   state? This bounds how aggressive learning may be.
5. Which pilot metrics can be defined without instrumentation, and which require
   real event data to be meaningful?
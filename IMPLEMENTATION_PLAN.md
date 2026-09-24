# Implementation Plan

Sequenced plan for moving Blinkitchen from its current five-step, panel-heavy
prototype to the target product direction in [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md).
This document is a plan only: no work below is implemented, and nothing here
changes the architecture in [ARCHITECTURE.md](ARCHITECTURE.md).

Rules that constrain every step:

- One `KitchenState` authority. Facts in, intelligence out.
- No new infrastructure (no server APIs, database, queues, runtime LLM, vector
  database or repository layers).
- No persisted projections.
- Deterministic behaviour, verified by tests.
- Engine complexity may grow; interface complexity must not.

## Where the work starts

Verified current state:

| Area | Today | Target |
| --- | --- | --- |
| Onboarding | 5 steps, name plus 4 abstract sliders plus pantry rows plus review | 3 steps, about one minute, minimal typing |
| Week view | About 12 panels of similar weight | 5 blocks with one hierarchy and drill-down |
| Meal ranking | Per-recipe factors, chain potential from the recipe corpus | Deterministic plan-level selection against the partial week |
| Ranking copy | "Ingredient chaining shapes which dishes rank highest" is an overclaim | Outcome-first copy that matches the mechanism |
| Diet coverage | 2 diets in data, 5 in the profile | 5 diets end to end |
| Optional ingredients | 1 line, treated as required | Defined optional semantics |
| Catalog | 43 ingredients, 14 recipes, 92 SKUs, no aliases | 300 to 500 ingredients, 300 to 1,500 recipes, alias-aware |
| Reviewer path | Home, then explore, then jump weeks manually | Home, 8-week demo, what changed, Blinkit Lens, product case |

## Phase 0: honesty and copy pass (smallest, unblocks everything)

Goal: make the interface stop overstating and start describing outcomes, without
changing layout.

| Item | Change |
| --- | --- |
| Home reuse claim | Replace the "chaining shapes which dishes rank highest" copy with an accurate statement: meals get a reuse signal from shared ingredients, and the plan shows which ingredients are used across meals |
| Chain copy | "Buy once, use in 3 meals" instead of "ingredient chaining opportunity" |
| Replenishment copy | "You use this often and you're running low" instead of process language |
| Substitution copy | "You've accepted this swap before" instead of affinity language |
| Basket copy | "Already at home" on customer surfaces; keep "demand avoided by pantry" only where analytical language belongs |
| Simulation labels | One clear page or section label plus repeats only where omission would mislead; stop labelling every value |

Definition of done: every customer-facing sentence describes an outcome a
household would recognise, and no sentence claims plan-level optimisation.

## Phase 1: three-step onboarding

Goal: get enough signal for a useful Week 1, in about one minute.

| Step | Captures | Notes |
| --- | --- | --- |
| 1. Your Household | Household size, diet, location, approximate weekly budget | Optional naming: prefill "My Kitchen" |
| 2. How You Eat | Cuisines, cooking frequency, 1 to 2 priorities | Priorities map to existing profile fields; no abstract sliders |
| 3. Your Kitchen | Quick-pick staples, fresh basics, regularly bought items, optional search and add, and a clear "start mostly empty" path | No per-ingredient inventory requirement |

Mapping to the existing domain (UI boundary only, no new domain concepts):

| Choice | Existing field |
| --- | --- |
| Use what I have | higher `planningPreference` |
| Save money | higher `priceSensitivity` |
| Cook quickly | higher `conveniencePreference` |
| Try new dishes | higher `explorationPreference` |
| Most days / a few days / occasionally | `cookingDaysPerWeek` |

Open design questions to resolve with usability evidence, not assumptions:

- Whether lightweight quantity capture (low, some, plenty) is useful enough to
  justify translating at the UI boundary, or whether presence alone is sufficient
  for Week 1.
- Whether the review step is needed at all. Default position: remove it, and only
  reinstate it if evidence shows households are making avoidable entry errors.

Definition of done: a new household reaches a useful Week 1 in three steps, no
screen needs explanation, and no step requires understanding of the engine.

## Phase 2: week view hierarchy

Goal: one screen, one primary question, one obvious next action.

```text
YOUR KITCHEN THIS WEEK      short state summary and what to use first
        ↓
THIS WEEK'S PLAN            3 to 5 meal choices
        ↓
YOUR BASKET                what to buy, what is already at home
        ↓
SMART EXTRAS               use soon, swap, restock
        ↓
WHAT CHANGED               1 to 2 learning insights
```

Concrete moves:

- Lead with the decision, not the metrics. Coverage, basket value and to-buy
  counts become a single supporting line rather than a KPI strip of equal weight.
- Meal cards show name, fit, share already at home, incremental cost, one or two
  reasons and the primary action. Scoring factors move behind "Why this?".
- The weekly checklist stays the action loop but only one step is primary.
- Chains, substitutions and replenishment become compact rows inside Smart
  Extras, each with one action.
- Learning shows 1 to 2 concrete statements with values behind expansion.
- Pantry snapshot and the planner become drill-down views, not default panels.

Definition of done: a first-time viewer can answer "what do I cook and what do I
buy" without expanding anything, and every panel has a reason to be visible.

## Phase 3: Week 1 to Week 8 comparison

Goal: make the longitudinal claim visible at a glance.

- One compact comparison surface: what Week 1 knew versus what Week 8 learned
  (recurring ingredients, cuisine behaviour, substitution preferences, waste
  patterns, replenishment signals).
- Keep the full weekly detail reachable by drill-down.
- Use derived values only, with no invented outcome text.

Definition of done: a reviewer can describe what changed between Week 1 and Week 8
in under a minute, from one screen.

## Phase 4: plan-level intelligence

Goal: make reuse real rather than corpus-derived.

Target selection loop, deterministic and explainable:

```text
for each plan slot:
    evaluate every remaining diet-allowed candidate against the partial week
        household fit        pantry coverage        incremental basket cost
        actual cross-meal reuse   use-soon rescue   budget fit
        convenience          variety                recent repetition
        ↓
    deterministic plan utility (weighted, documented, inspectable)
        ↓
    choose the best candidate, add it to the week
```

Explicitly out of scope: solver frameworks, learned weights, stochastic search.
A greedy deterministic planner with an inspectable utility function is the goal.

Terminology to keep honest after this phase:

- Meal-level: chain potential and reuse potential (today's corpus signal).
- Plan-level: actual cross-meal reuse, measured against the partial plan.

Definition of done: `ingredientReuse` (or its successor) reflects ingredients the
week actually shares, tests prove household behaviour changes the plan, and the
UI can explain each choice in one sentence.

## Phase 5: catalog and diet completeness

Goal: make the data credible at a larger scale without touching runtime
architecture.

1. Alias-aware canonical ingredients, so dahi, curd and yogurt resolve to one
   ingredient.
2. Diet model completed end to end: profile, ingredients, recipes, ranking,
   substitutions and onboarding all support vegetarian, vegan, eggetarian,
   non_vegetarian and flexible, with real catalog data behind each.
3. Defined optional-ingredient semantics: optional lines do not block a recipe and
   do not become required purchases.
4. Catalog growth to the target ranges in [DATA_STRATEGY.md](DATA_STRATEGY.md),
   quality first.
5. Provenance on every recipe and substitution.

Definition of done: the catalog can absorb new sources without changing runtime
code, and no recipe line depends on string matching.

## Phase 6: measurement readiness

The prototype measures nothing today. This phase is about making a real pilot
measurable, not about adding analytics infrastructure to the prototype.

- Define the event names and definitions that a pilot would need, aligned with the
  metrics in [PRODUCT_CASE.md](PRODUCT_CASE.md).
- Keep the prototype itself free of tracking; document the instrumentation plan
  instead.
- Treat onboarding completion, correction burden and pantry coverage as first
  class signals, because they determine whether the product is usable at all.

Definition of done: each metric in the product case has a stated definition and a
stated data source for a real deployment.

## Sequencing and dependencies

```text
Phase 0 (copy honesty)
    ↓
Phase 1 (three-step onboarding) ──┐
    ↓                            │
Phase 2 (week hierarchy) ────────┼─→ Phase 3 (Week 1 to 8 comparison)
    ↓                            │
Phase 4 (plan-level intelligence)┘
    ↓
Phase 5 (catalog and diet)  ← can run in parallel with 2 to 4
    ↓
Phase 6 (measurement readiness)
```

Phase 0 is independent. Phase 3 depends on a stable week hierarchy, so it follows
Phase 2. Phase 4 changes what the week view can claim, so it should land before
final copy freezes. Phase 5 is data work and can proceed in parallel.

## Verification gates per phase

Every phase must:

- keep `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build`
  green;
- run `npm run test:e2e` when browser-facing behaviour changes;
- add or update tests that prove household behaviour still changes the output;
- update the authoritative docs rather than adding new specification files;
- keep current versus planned behaviour explicit in both docs and UI copy.

Existing browser tests assert behavioural landmarks (week labels, section
accessible names, mobile table-to-list swaps, focus rings). Any UI restructure
must update those assertions alongside the change, never weaken them.

## Explicit non-goals for this plan

- Checkout, ordering, delivery, payments or provider integrations.
- Accounts, auth, databases, server APIs or queues.
- Runtime LLMs, embeddings or vector databases.
- Persisted recommendations, baskets, learning or cohort state.
- Real Blinkit data, pricing or inventory.
- Turning the Blinkit Lens into an operations dashboard.

## What stays unproven

No amount of prototype work answers the product questions. Onboarding completion,
substitution behaviour, pantry correction burden, basket tension and retention all
require real customers. This plan makes the prototype ready to test those
questions; it does not answer them.
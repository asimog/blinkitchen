# Product Scope

## The product problem

Quick-commerce systems can hold rich transaction data and still know very little
about the household's current kitchen. Purchase history does not reliably reveal:

- what is still at home;
- what was actually consumed;
- what was wasted;
- which meals it was used in;
- which substitutions the household accepted;
- what is running low right now;
- what this household always keeps.

## The product thesis

> Grocery apps usually understand carts and transactions. Blinkitchen tries to
> understand the kitchen itself over time.

Expanded: Blinkitchen is a longitudinal household grocery intelligence layer. It
models what a household already has, cooks, consumes, wastes, substitutes and
repeatedly replenishes, then uses those facts to produce more relevant meals,
baskets, substitutions and replenishment suggestions over time.

The core product is:

```text
HOUSEHOLD STATE  +  LONGITUDINAL BEHAVIOUR  →  HOUSEHOLD GROCERY INTELLIGENCE
```

Recipes and commerce data are supporting layers. Blinkitchen is not primarily a
recipe app, pantry tracker, meal-planning calendar, marketplace clone, scraper,
AI demonstration or infrastructure showcase.

## Target audience

- A Blinkit product or strategy reviewer evaluating whether household context is
  a credible product opportunity.
- Product and engineering reviewers evaluating the prototype as a working,
  deterministic system.

## The longitudinal product loop

```text
Onboarding
    ↓
Kitchen State (facts)
    ↓
Understand pantry and household facts
    ↓
Recommend meals → construct pantry-aware weekly plan
    ↓
Build missing-only basket → reuse ingredients across meals
    ↓
Offer substitutions → observe purchases, cooking, consumption, waste
    ↓
Learn household behaviour → generate replenishment signals
    ↓
Next week's recommendations improve
```

The product value is not "Week 1 gives a good recipe". It is that the grocery
experience becomes increasingly household-specific as facts accumulate.

## Customer value hypotheses

- Fewer unnecessary purchases, because the basket only fills real gaps.
- Less meal-planning effort, because meals start from what is already home.
- Better use of food already owned and less waste.
- More relevant meals as observed behaviour replaces stated preference.
- Substitutions that reflect this household's past decisions.
- Replenishment prompts that come from observed usage rather than guesswork.
- Smaller, more useful baskets.

## Potential Blinkit value hypotheses

- More relevant recommendations with household context.
- Stronger recipe-to-basket usefulness.
- Context-aware cross-sell and household-aware merchandising.
- Better replenishment timing.
- Better substitution ranking.
- Richer understanding of recurring demand.
- Potentially stronger retention and trust.

None of these are proven by the prototype. They are hypotheses, and
[PRODUCT_CASE.md](PRODUCT_CASE.md) states how they would be tested.

## The business tension

Pantry awareness can reduce immediate basket value by removing purchases the
household does not need. That is intentional, and it is the central business
question of the product case: does improved relevance and trust create enough
conversion, frequency, retention and attach benefit to offset the removal of
unnecessary purchases? See [PRODUCT_CASE.md](PRODUCT_CASE.md).

## Current MVP (implemented)

Verified against `main`:

| Area | What exists now |
| --- | --- |
| Authority | One `KitchenState` per household: profile, pantry, grocery/consumption/meal facts, week-scoped choices |
| Engine | Deterministic meal ranking, plan suggestion, pantry-aware basket, ingredient chains, use-soon, substitutions, replenishment, learning, explanations |
| Catalog | 43 canonical ingredients, 14 recipes, 4 cuisines, 8 directed substitutions, 46 simulated product templates expanded to 92 SKUs across 2 Delhi locations |
| Simulation | 4 fixture households on the same engine, 8 deterministic weeks, prefix-consistent |
| Customer surfaces | `/`, `/explore`, `/explore/[id]`, `/build`, `/kitchen` |
| Strategy surface | `/blinkit` cohort projection, clearly labelled simulated |
| Storage | One versioned localStorage slot (`blinkitchen:v2:kitchen`), Zod-validated, facts only |
| Verification | 125 unit tests, 12 Playwright tests, lint and typecheck clean |

## Current limitations

Honest list, all verified in code:

1. **Onboarding is five steps.** It asks for a household name, four abstract
   0..1 preference sliders, individual pantry rows and a separate review screen.
2. **The week view is dense.** Roughly a dozen panels of similar visual weight
   compete on one page (metrics, checklist, pantry, planner, ranked meals,
   scoring, chains, basket, swaps, replenishment, learning, narrative).
3. **Meal ranking is per-recipe, not plan-level.** `ingredientReuse` is a
   specificity-weighted reuse or chain potential across the recipe corpus. The
   plan takes the top-ranked meals and chains are detected afterwards; the engine
   does not yet optimise marginal cost, pantry use and shared ingredients across
   the week as a whole.
4. **Copy occasionally overstates.** For example the home page says ingredient
   chaining shapes which dishes rank highest. That is not accurate enough: reuse
   potential is one ingredient-level factor among six, and chain detection happens
   after ranking.
5. **Diet support is partial end to end.** The profile supports five diets
   (vegetarian, vegan, eggetarian, non_vegetarian, flexible); the catalog data and
   onboarding only cover vegetarian and vegan, and there are no egg or meat
   ingredients to filter.
6. **`optional: true` recipe ingredients are treated as required** by meal impact,
   basket and chains. The seed data contains one optional line.
7. **Ingredient aliases do not exist.** Ingredients are canonical ids only; the
   catalog cannot yet absorb "curd", "dahi" and "yogurt" as one ingredient.
8. **Quantity capture is exact.** Pantry rows are numeric with canonical units;
   there is no "low / some / plenty" approximation.
9. **Pack sizes are not optimised across the week.** Each basket line resolves to
   the cheapest available SKU for that line, in isolation.
10. **Simulation is not evidence.** Four fixtures demonstrate mechanics under
    encoded assumptions; they say nothing about real customers.

## Target direction (planned, not implemented)

```text
ASK LESS
    ↓
LEARN OVER TIME
    ↓
UNDERSTAND THE KITCHEN
    ↓
MAKE BETTER GROCERY DECISIONS
    ↓
SHOW ONLY WHAT THE USER NEEDS NOW
```

- **Three-step onboarding**: Your Household, How You Eat, Your Kitchen. Then
  Start Week 1. Roughly one minute, minimal typing, no review screen.
- **Simpler week view**: one hierarchy (this week's kitchen, this week's plan,
  the basket, smart extras, what changed) with mechanics behind "Why this?".
- **Plan-level intelligence**: evaluate each candidate meal against the partial
  week so reuse becomes real cross-meal reuse, not a corpus signal.
- **Compact Week 1 to Week 8 comparison** so a reviewer can see what changed
  without reading eight dense screens.
- **Honest, outcome-first copy**: "68% already at home", "buy once, use in 3
  meals", "you've accepted this swap before".
- **Progressive learning**: pantry, staples, cadence and preferences are
  corrected and refined over time instead of demanded upfront.

The sequenced work is in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Experience principles

These govern the target interface. They do not describe the current UI yet.

1. **Three-step onboarding.** No more than three short primary steps without
   explicit product justification.
2. **Ask less upfront.** Capture only what is needed to avoid obviously poor
   Week 1 recommendations: household size, diet, location, budget, broad cooking
   behaviour, and a light kitchen starting point.
3. **Learn progressively.** Cuisine affinity, staples, replenishment cadence,
   substitution preferences, waste patterns and real price or convenience
   behaviour are inferred from facts over time, not asked at signup.
4. **Correct later.** Pantry quantities, forgotten ingredients, budget and
   preferences can be changed afterwards without restarting onboarding.
5. **One primary job per screen.** Home explains the thesis, onboarding gets the
   household started, the week decides what to cook and buy, learning explains
   what changed, the Blinkit Lens explains the opportunity.
6. **Insight before mechanics.** Show the decision first ("82% already at home",
   "74 more"), and keep scoring factors behind "Why this?".
7. **Action before analysis.** Cook this, use this soon, buy these, swap this,
   restock this. Reasoning is secondary on customer surfaces.
8. **Progressive disclosure.** Default: the decision. Expand: a short
   explanation. Deep detail: scoring and mechanics on request.
9. **Reviewer path first.** A reviewer must reach the strongest demonstration
   (the simulated 8-week journey) without completing onboarding.
10. **The interface stays simpler than the engine.** A rich engine does not
    require a rich screen. Complexity belongs in the engine.

## Success criteria

A Blinkit product or strategy reviewer should be able to, without reading
documentation or expanding every panel:

1. understand the thesis within seconds;
2. open the simulated demo immediately;
3. understand what Week 1 knows;
4. jump to later weeks;
5. see what was learned;
6. see how pantry state changes the basket;
7. see at least one clear example of ingredient reuse;
8. understand substitution memory;
9. understand replenishment;
10. open the Blinkit Lens and separate demonstrated mechanics from hypotheses.

A customer building a household should be able to finish onboarding in about a
minute, start from an imperfect pantry, get a useful Week 1, and correct or extend
their kitchen later.

## Explicit non-goals

Authentication, accounts, sessions, roles, databases, server-side storage,
payments, checkout, orders, delivery, warehouse or provider operations, real
Blinkit APIs, real pricing, notifications, email or SMS, runtime LLMs,
embeddings, vector databases, ML infrastructure, microservices, queues, event
buses, GraphQL, state management libraries, generic repository layers, and any
infrastructure that does not make household intelligence more visible.

## Simulation honesty

All products, prices, availability, households and aggregate outcomes are
simulated. The UI labels them at page and section level. Simulation demonstrates
product mechanics under encoded assumptions; it is not evidence about real
Blinkit customers, demand or inventory. See [SIMULATION.md](SIMULATION.md).
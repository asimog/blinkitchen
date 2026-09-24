# Architecture

## The one rule

> Persist facts. Derive intelligence.

There is exactly **one authoritative household model**: `KitchenState`. It holds
profile facts, pantry stock, append-only household facts (groceries received,
ingredients used or wasted, meals completed) and explicit week-scoped choices
(selected meals, skipped recommendations, substitution decisions). It never holds
recommendations, scores, baskets, coverage metrics, explanations or learning
summaries.

Everything else is a pure projection:

```text
KitchenState  + Catalog  =  WeekIntelligence   (buildWeekIntelligence)
KitchenState[] + Catalog =  BlinkitInsights    (buildBlinkitInsights)
```

There is no second household authority, no persisted weekly state, no stored
recommendation, no stored basket and no stored analytics.

## Dependency direction

```text
src/domain/units.ts          (leaf: Unit, normalization)
        ↓
src/catalog/*                (read-only catalog: types, schema, load, grocery graph)
        ↓
src/domain/kitchen/*         (KitchenState, commands, invariants)
        ↓
src/intelligence/*           (pure derived projections)
        ↓
src/simulation/*  src/insights/*
        ↓
src/storage/*                (localStorage boundary, Zod-validated)
        ↓
src/app/*  src/components/*  (React)
```

Rules:

- `domain`, `catalog`, `intelligence`, `simulation` and `insights` never import
  React, browser APIs, `fs`, `fetch`, `Date.now()` or `Math.random()`.
- Time and ids are passed explicitly by callers.
- The UI calls pure functions; it never re-implements scoring.
- `src/catalog/load.ts` is the single seam where fixture JSON becomes a `Catalog`.
  When real data arrives, only this seam changes.
- Recipes reference canonical ingredients, never SKUs. Products reference
  ingredients. The commerce layer decides how requirements map to packages.

## Pure core, small effect boundary

The entire product logic is pure TypeScript:

```ts
applyKitchenCommand(state, command): CommandResult
buildWeekIntelligence(kitchen, catalog): WeekIntelligence
simulateJourney(startingKitchen, catalog, policy, weeks?): KitchenState[]
buildBlinkitInsights(kitchens, catalog): BlinkitInsights
```

The only effectful code is:

- `src/storage/kitchen-storage.ts`, the browser localStorage boundary (versioned
  key `blinkitchen:v2:kitchen`, Zod-validated on read, discarded safely when
  invalid);
- React components;
- the deterministic catalog loader (static JSON imports).

There is no server-side logic, no API route, no database and no auth. Next.js
serves pages and all intelligence runs from the same pure functions:

- `/kitchen`, `/blinkit` and `/explore/[id]` compute in the browser from the
  browser-stored or fixture state.
- `/` and `/explore` compute their projections at render time (the home page
  derives a Week 1 preview and cohort evidence from the same fixtures).

Neither path persists anything, and both use the identical engine.

## Module map

```text
src/
  app/                routes: /, /build, /kitchen, /explore, /explore/[id], /blinkit
  components/
    shell/            SiteNav (primary navigation with current-page state)
    onboarding/       BuildWizard (currently five steps; target is three, see PRODUCT_SCOPE.md)
    kitchen/          WeekView, JourneyBar and its panels, shared by /explore/[id] and /kitchen
    explore/          household rail and the journey controller
    blinkit/          cohort lens rendering
  domain/
    units.ts          Unit type, dimension rules, normalizeQuantity
    order.ts          compareStrings: locale-independent ordering for the core
    kitchen/          types.ts, schema.ts (Zod), commands.ts, state.ts
  catalog/            types.ts, schema.ts (Zod), load.ts, grocery-graph.ts
  intelligence/       index.ts (buildWeekIntelligence), meals, basket,
                      substitutions, replenishment, learning, chains,
                      use-soon, costing, diet, explanations, labels
  simulation/         fixtures.ts, policies.ts, simulate.ts
  insights/           blinkit.ts (buildBlinkitInsights)
  storage/            kitchen-storage.ts (localStorage seam)
                      use-stored-kitchen.ts (useSyncExternalStore reader)
  data/               seed JSON: ingredients, recipes, product templates,
                      substitutions, locations
tools/oxlint/anti-slop  vendored anti-slop lint rules (see its UPSTREAM.md)
oxlint.config.ts    anti-slop rule policy; .kilo/skills/install-anti-slop keeps
                    the installer/updater bundle
```

Everything under `src/domain`, `src/catalog`, `src/intelligence`, `src/simulation`
and `src/insights` is verified pure by tests and lint conventions. Ordering inside
the core uses `compareStrings` (code-unit comparison) rather than `localeCompare`,
because collation depends on the runtime's ICU data and would break the
determinism guarantee across environments.

## Simulation uses the same domain

The simulation is not a second engine. Each simulated week:

```text
buildWeekIntelligence → policy emits KitchenCommand[] → applyKitchenCommand
```

The policy projects its own decisions through the same pure functions, so what a
simulated household buys, cooks and consumes matches exactly what the UI would
show for those choices. Nothing bypasses domain invariants. See
[SIMULATION.md](SIMULATION.md).

## Rich engine, simple interface

Engine complexity does not require interface complexity.

The engine calculates ranking, coverage, chains, use-soon opportunities, basket
requirements, substitutions, replenishment, learning, explanations and cohort
signals. The interface should compose only the projections relevant to the
current decision, in a deliberate hierarchy:

```text
DEFAULT       the decision
EXPAND        a short explanation
DEEP DETAIL   scoring and mechanics on request
```

This is presentation hierarchy, not a new architectural layer. Simplifying the
interface must not remove intelligence from the engine.

## Planned offline ingestion boundary

The catalog is currently author-curated fixture JSON. The target data foundation
adds an offline pipeline that produces the same `Catalog` shape:

```text
raw sources → RawRecipe → parse → alias resolution → unit normalization
    → schema validation → deduplication → CanonicalRecipe → curated catalog
```

Ingestion stays outside runtime Blinkitchen: the application continues to consume
validated catalog data through `src/catalog/load.ts`. See
[DATA_STRATEGY.md](DATA_STRATEGY.md).

## Known implementation limitations worth knowing

Three limits matter architecturally: meal ranking is per-recipe (the reuse factor
is a corpus signal, not whole-week optimisation), `optional: true` recipe
ingredients are counted as required, and diet filtering covers only the
vegetarian and vegan data the catalog actually carries. The full product-level
list, with the mechanisms behind each, is in [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md).
The work to remove them is sequenced in
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Deliberate deviations from the original specification

Four simplifications were chosen during the design review (fewer concepts, harder
to create invalid state):

1. **`recommendationFeedback` is folded into `weeklyChoices`.** Selected meals,
   skipped recommendations and substitution decisions are all week-scoped explicit
   user choices; one channel instead of two. See DATA_MODEL.md.
2. **`preferenceFacts` is not a separate fact channel.** Stated preferences live in
   the profile; behavioural preference evidence is derived from meal, consumption
   and choice facts. A third preference channel would be a second authority.
3. **Simulated SKUs are expanded deterministically at load time** from product
   templates and locations instead of committing generated SKU JSON. No generated
   artifact can drift from its generator, and the expansion is tested.
4. **Recipe provenance is catalog data.** Recipe source URLs point to Blinkit
   Recipes; live image, SKU and product ingestion remains outside this prototype.

## What was deliberately not built

No auth, accounts, permissions, database, ORM, API routes, provider workflows,
checkout, order state machine, event bus, state management library, runtime LLM,
ML or caching layer. Each of these would add more concepts than it deletes for a
prototype whose job is to make household intelligence visible.
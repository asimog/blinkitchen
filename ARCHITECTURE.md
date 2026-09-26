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
KitchenState   + Catalog = WeekIntelligence   (buildWeekIntelligence)
KitchenState[] + Catalog = BlinkitInsights    (buildBlinkitInsights)
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
  React, browser APIs, `fs`, `fetch`, `Date.now()` or `Math.random()`. Time and
  ids are passed explicitly by callers.
- The UI calls pure functions; it never re-implements scoring.
- `src/catalog/load.ts` is the single seam where fixture JSON becomes a `Catalog`.
  Ingestion is offline: `tools/catalog-harvest/` harvests Blinkit Recipes into
  raw JSON, the generator normalises aliases, quantities and packs, and commits
  only the resulting `src/data/*.json`. Runtime code never fetches anything.
- Recipes reference canonical ingredients, never SKUs. Products reference
  ingredients. The commerce layer decides how requirements map to packages.
- Ordering inside the core uses `compareStrings` (code-unit comparison), never
  `localeCompare`, so output cannot depend on the runtime's ICU data.

## Pure core, small effect boundary

The entire product logic is pure TypeScript:

```ts
applyKitchenCommand(state, command): CommandResult
buildWeekIntelligence(kitchen, catalog): WeekIntelligence
simulateJourney(startingKitchen, catalog, policy, weeks?): KitchenState[]
buildBlinkitInsights(kitchens, catalog): BlinkitInsights
```

The only effectful code is the browser localStorage boundary
(`src/storage/*`), React components, and the deterministic catalog loader (static
JSON imports). There is no server-side logic, no API route, no database and no
auth. Next.js serves pages; all intelligence runs from the same pure functions:

- `/kitchen`, `/blinkit` and `/explore/[id]` compute in the browser from the
  browser-stored or fixture state.
- `/` and `/explore` compute their projections at render time from the same
  fixtures.

Neither path persists anything, and both use the identical engine.

## Module map

```text
src/
  app/                routes: /, /build, /kitchen, /explore, /explore/[id], /blinkit
  components/
    shell/            SiteNav (primary navigation with current-page state)
    onboarding/       BuildExperience, BuildWizard (three steps: household,
                      how you eat, your kitchen) and onboarding-prefs.ts, the
                      pure priority/quick-pick mapping
    kitchen/          WeekView, JourneyBar and its panels, shared by /explore/[id] and /kitchen
    explore/          household rail and the journey controller
    blinkit/          cohort lens rendering
  domain/
    units.ts          Unit type, dimension rules, normalizeQuantity
    order.ts          compareStrings: locale-independent ordering for the core
    kitchen/          types.ts, schema.ts (Zod), commands.ts, state.ts
  catalog/            types.ts, schema.ts (Zod), load.ts, grocery-graph.ts
  intelligence/        index.ts (buildWeekIntelligence), meals (per-recipe ranking),
                      planner (plan-level greedy selection), journey (Week 1 to
                      Week 8 comparison), basket, substitutions, replenishment,
                      learning, chains, use-soon, costing, diet, explanations, labels
  simulation/         fixtures.ts, policies.ts, simulate.ts
  insights/           blinkit.ts (buildBlinkitInsights)
  storage/            kitchen-storage.ts (localStorage seam)
                      use-stored-kitchen.ts (useSyncExternalStore reader)
  data/               generated catalog fixtures: ingredients, recipes,
                      product templates, substitutions, locations
tools/oxlint/anti-slop  vendored anti-slop lint rules (see its UPSTREAM.md)
tools/catalog-harvest  offline harvest + generator (not shipped; output ignored)
oxlint.config.ts    anti-slop rule policy; .kilo/skills/install-anti-slop keeps
                    the installer/updater bundle
```

## Simulation uses the same domain

The simulation is not a second engine. Each simulated week:

```text
buildWeekIntelligence → policy emits KitchenCommand[] → applyKitchenCommand
```

The policy projects its own decisions through the same pure functions, so what a
simulated household buys, cooks and consumes matches exactly what the UI would
show for those choices. Nothing bypasses domain invariants. See
[SIMULATION.md](SIMULATION.md).

## Planned offline ingestion boundary

The catalog is currently author-curated fixture JSON. The target data foundation
adds an offline pipeline that produces the same `Catalog` shape:

```text
raw sources → RawRecipe → parse → alias resolution → unit normalization
    → schema validation → deduplication → CanonicalRecipe → curated catalog
```

Ingestion stays outside runtime Blinkitchen: the runtime must remain deterministic,
raw sources and alias tables must not ship to the browser, and data changes must be
diffable artifacts. The application keeps consuming validated catalog data through
`src/catalog/load.ts`; a bigger, better catalog is still just a `Catalog`. See the
future data direction in [DATA_MODEL.md](DATA_MODEL.md) and Phase 6 of
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Deliberately absent infrastructure

No auth, accounts, permissions, database, ORM, API routes, provider workflows,
checkout, payments, orders, delivery, notifications, email or SMS, real Blinkit
APIs, event bus, queues, state management library, runtime LLM, embeddings, vector
database, ML pipeline, microservices or caching layer. Each would add more concepts
than it deletes for a prototype whose job is to make household intelligence visible.

## Known limitations

Plan selection is now plan-level (deterministic greedy, one slot at a time) with
derived per-meal explanations, and `optional: true` lines no longer block a
recipe or enter the basket. What remains: diet filtering covers only the
vegetarian and vegan data the catalog carries (deferred by scope); ingredient
`aliases` are ingestion provenance and are not used at runtime; and recipe
quantities are approximate normalisations of the harvested amounts, good for
basket reasoning but not nutrition. The current state of each is tracked in
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

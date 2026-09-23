# Architecture

## The one rule

> Persist facts. Derive intelligence.

There is exactly **one authoritative household model**: `KitchenState`. It contains
profile facts, pantry stock, append-only household facts (groceries received,
ingredients used/wasted, meals completed) and explicit week-scoped user choices
(selected meals, skipped recommendations, substitution decisions). It never
contains recommendations, scores, baskets, coverage metrics, explanations or
learning summaries.

Everything else is a pure projection:

```text
KitchenState + Catalog  =  WeekIntelligence      (buildWeekIntelligence)
KitchenState[] + Catalog =  BlinkitInsights      (buildBlinkitInsights)
```

There is no second household authority, no persisted weekly state, no stored
recommendation, no stored basket, no stored analytics.

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

- `domain`, `intelligence`, `simulation`, `insights` and `catalog` never import React.
- Nothing in the pure core imports `localStorage`, `fetch`, `fs`, `Date.now()` or
  `Math.random()`. Time and ids are passed explicitly by callers.
- The UI calls pure functions; it never re-implements scoring.
- `src/catalog/load.ts` is the single seam where fixture JSON becomes a `Catalog`.
  When real data arrives, only this seam changes.

## Pure core, small effect boundary

The entire product logic is pure TypeScript:

```ts
applyKitchenCommand(state, command): CommandResult
buildWeekIntelligence(kitchen, catalog): WeekIntelligence
simulateJourney(startingKitchen, catalog, policy): KitchenState[]
buildBlinkitInsights(kitchens, catalog): BlinkitInsights
```

The only effectful code is:

- `src/storage/kitchen-storage.ts` (browser localStorage, versioned key
  `blinkitchen:v1:kitchen`, Zod-validated on read, discarded safely when invalid),
- React components,
- the deterministic fixtures and catalog loader (static JSON imports).

There is no server-side logic, no API routes, no database and no auth. Next.js
serves pages; all intelligence executes locally in the browser.

## Module map

```text
src/
  app/                routes: /, /build, /kitchen, /explore, /explore/[id], /blinkit
  components/
    onboarding/       BuildWizard (five steps)
    kitchen/          WeekView and its panels, shared by /explore/[id] and /kitchen
    explore/          archetype cards and the journey controller
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
and `src/insights` is verified pure by tests and lint conventions: no React, no
browser APIs, no clocks, no randomness. Ordering inside the core uses
`compareStrings` (code-unit comparison) rather than `localeCompare`, because
collation depends on the runtime's ICU data and would break the determinism
guarantee across environments.

## Deliberate deviations from the original specification

Three simplifications were chosen during the design review (fewer concepts,
harder to create invalid state):

1. **`recommendationFeedback` is folded into `weeklyChoices`.** Selected meals,
   skipped recommendations and substitution decisions are all week-scoped explicit
   user choices; one channel instead of two. See DATA_MODEL.md.
2. **`preferenceFacts` is not a separate fact channel.** Stated preferences live in
   the profile; behavioural preference evidence is derived from meal, consumption
   and choice facts. A third preference channel would be a second authority.
3. **Simulated SKUs are expanded deterministically at load time** from product
   templates × locations instead of committing generated SKU JSON. No generated
   artifact can drift from its generator; the expansion is tested for determinism.

## What was deliberately not built

No auth, accounts, permissions, database, ORM, API routes, provider workflows,
checkout, order state machine, event bus, state management library, LLM, ML or
caching layer. Each of these would add more concepts than it deletes for a
prototype whose job is to make household intelligence visible.

# Blinkitchen

A portfolio product case and working prototype of a **longitudinal household grocery
intelligence layer**.

> Grocery apps usually understand carts and transactions. Blinkitchen tries to
> understand the kitchen itself over time.

Blinkitchen models what a household already has, cooks, consumes, wastes,
substitutes and repeatedly replenishes, then turns those facts into meal
recommendations, a pantry-aware basket, substitutions and replenishment signals
that improve as the weeks accumulate.

It is intentionally not a recipe app, a pantry tracker, a marketplace clone or an
AI demo. Recipes and simulated commerce data are supporting layers.

## The demo path (start here)

The fastest way to evaluate the product, about three minutes. The simulated
8-week demo is the preferred review path.

1. `/`: the thesis in one screen, with a live Week 1 projection.
2. `/explore/pantry_planner`: the simulated 8-week demo. Jump between weeks with
   the week rail; watch the basket, reuse and learning change.
3. `/explore/cuisine_explorer`: different household inputs, same engine.
4. `/blinkit`: what the prototype demonstrates across the cohort, what it could
   enable for Blinkit, and what would still need real customer validation.
5. [PRODUCT_CASE.md](PRODUCT_CASE.md): opportunity, hypothesis, experiment and
   metrics.

You do not need to build a household to understand the product. Building one is
the secondary path (`/build`, then `/kitchen`).

## How it works

```text
Household facts (KitchenState)      Catalog (read-only, simulated)
        └──────────────┬────────────────────┘
                       ↓
            WeekIntelligence (derived, never stored)
                       ↓
        ┌──────────────┴──────────────┐
        ↓                             ↓
 Customer experience            Blinkit Lens
 /build, /kitchen,              /blinkit
 /explore, /explore/[id]
```

One household authority. Facts are persisted, intelligence is recomputed on every
render. Derived projections (scores, baskets, coverage, chains, swaps,
replenishment, learning, cohort insights) are never written to state.

## Customer experience vs Blinkit Lens

- **Customer experience**: pantry-aware meals, "what you could cook", the basket
  that only fills real gaps, swaps this household is likely to accept,
  replenishment prompts and a weekly learning summary.
- **Blinkit Lens**: the same facts viewed as a product-strategy projection:
  recurring gaps, reuse patterns, swap outcomes, replenishment signals and
  archetype differences across four simulated households.

## Current state and target direction

The prototype today is a rich deterministic engine in front of a five-step
onboarding and a dense week view. The target direction simplifies the interface
sharply while keeping the engine: a three-step onboarding, one primary job per
screen, insight before mechanics, and progressive disclosure.

- Current capabilities, limitations and the target experience:
  [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md)
- Sequenced plan for the simplification work: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

## Run it

Requirements: Node 24+, npm.

```powershell
npm install
npm run dev
```

Open http://localhost:3000

## Verification

```powershell
npm run lint
npm run typecheck
npm run test      # 125 unit tests across 13 files
npm run build
npm run test:e2e  # 12 Playwright tests; first time: npx playwright install chromium
```

`npm run lint` runs two linters: the vendored
[anti-slop](https://github.com/dmmulroy/anti-slop) Oxlint rules (boundary
parsing, no assertion laundering, deterministic spacing) and ESLint.
`npm run lint:fix` applies the anti-slop whitespace autofix.

`npm run test:e2e` builds and serves a production build on port 3100, so stop any
running `npm run dev` first (Next.js allows only one dev server per project
folder). Browser coverage: a desktop journey suite and a 390 px mobile smoke
suite.

## Surfaces

| Surface | What it shows |
| --- | --- |
| `/` | The product thesis plus a derived Week 1 projection and cohort evidence |
| `/explore` | Four simulated households, each replayable across Weeks 1 to 8 |
| `/explore/[id]` | One household's week: plan, basket, reuse, swaps, replenishment, learning |
| `/build` | Build your own household (stored only in this browser) |
| `/kitchen` | Your interactive household journey |
| `/blinkit` | Cohort-level projection across the simulated households |

Everything on `/blinkit` and `/explore` is simulated. All products, prices,
households and availability are fictional, and no simulated result is evidence
about real Blinkit customers.

## Documentation

- [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md): problem, thesis, MVP, limitations, experience principles, non-goals
- [PRODUCT_CASE.md](PRODUCT_CASE.md): the PM case, opportunity, hypothesis, experiment, metrics, risks
- [ARCHITECTURE.md](ARCHITECTURE.md): what owns truth, what is derived, why the system stays small
- [DATA_MODEL.md](DATA_MODEL.md): KitchenState, Catalog, facts, projections, current seed counts
- [DATA_STRATEGY.md](DATA_STRATEGY.md): the target data foundation and offline ingestion boundary
- [SIMULATION.md](SIMULATION.md): the four households, the deterministic 8-week loop, assumptions
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): sequenced plan for the target product direction
- [AGENTS.md](AGENTS.md): working rules for coding agents
# Blinkitchen

A portfolio product case and working prototype of a **longitudinal household
grocery intelligence layer**.

> Grocery apps usually understand carts and transactions. Blinkitchen tries to
> understand the kitchen itself over time.

Blinkitchen models what a household already has, cooks, consumes, wastes,
substitutes and repeatedly replenishes, then turns those facts into meal
recommendations, a pantry-aware basket, substitutions and replenishment signals
that improve as the weeks accumulate. It is intentionally not a recipe app, a
pantry tracker, a marketplace clone or an AI demo. Everything simulated is
labelled; no simulated result is evidence about real Blinkit customers.

## Fastest demo path (about three minutes)

The simulated 8-week demo is the preferred review path; you do not need to build a
household to understand the product.

1. `/` — the thesis in one screen, with a live Week 1 projection.
2. `/explore/pantry_planner` — the simulated 8-week demo. Jump between weeks with
   the week rail, then use the "Week 1 → Week 8" link for what the system learned.
3. `/explore/cuisine_explorer` — different household inputs, same engine.
4. `/blinkit` — what the prototype demonstrates across the cohort, what it could
   enable for Blinkit, and what still needs real customer validation.
5. [PRODUCT_CASE.md](PRODUCT_CASE.md) — opportunity, hypothesis, experiment and
   metrics.

Building a household is the secondary path: `/build`, then `/kitchen`.

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
render. Scores, baskets, coverage, chains, swaps, replenishment, learning and
cohort insights are never written to state.

The catalog is built offline from Blinkit Recipes by `tools/catalog-harvest`
(harvest → alias normalisation → generated JSON fixtures); runtime code never
fetches anything. Products, prices and households are simulated; recipe
structures carry their Blinkit source URL.

## Routes

| Route | What it shows |
| --- | --- |
| `/` | The product thesis plus a derived Week 1 projection and cohort evidence |
| `/explore` | Four simulated households, each replayable across Weeks 1 to 8 |
| `/explore/[id]` | One household's week: plan, basket, reuse, swaps, replenishment, learning |
| `/build` | Build your own household (stored only in this browser) |
| `/kitchen` | Your interactive household journey |
| `/blinkit` | Cohort-level projection across the simulated households |

## Run it

Requirements: Node 24+, npm.

```powershell
npm install
npm run dev
```

Open http://localhost:3000

## Verification

```powershell
npm run lint       # oxlint (anti-slop) + eslint
npm run typecheck
npm run test       # 145 unit tests across 17 files
npm run build
npm run test:e2e   # 13 Playwright tests; first time: npx playwright install chromium
```

`npm run lint` includes the vendored anti-slop Oxlint ruleset
(`tools/oxlint/anti-slop`); `npm run lint:fix` applies the whitespace autofix.
`npm run test:e2e` builds and serves a production build on port 3100, so stop any
running `npm run dev` first. Coverage is a desktop journey suite and a 390 px
mobile smoke suite.

## Documentation

- [PRODUCT_CASE.md](PRODUCT_CASE.md) — opportunity, hypothesis, experiment, metrics
- [ARCHITECTURE.md](ARCHITECTURE.md) — what owns truth, what is derived, why the system stays small
- [DATA_MODEL.md](DATA_MODEL.md) — KitchenState, Catalog, facts, projections, future data direction
- [SIMULATION.md](SIMULATION.md) — the four households, the deterministic 8-week loop, assumptions
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — sequenced plan for the target product direction
- [AGENTS.md](AGENTS.md) — working rules for coding agents

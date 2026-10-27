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

## Fastest demo path (about two minutes)

The app is a phone-first kitchen. Open it on a phone, or in a narrow window.

1. `/start` — three taps: who's eating, veg or non-veg, what's at home. Or open
   the lived-in sample kitchen (the Mehtas, four simulated weeks in).
2. `/week` — swipe dinners into the week, or "Fill the rest for me".
3. `/checkout` — the plain prototype basket: only what is missing, with packs,
   prices and the meals each item is for. Nothing is ordered.
4. `/` — "What's cooking? / आज क्या बनेगा?": tonight's dinner, what it rescues,
   and what carries into a later meal.
5. `/pantry` — the shelf and the flags: what to use today, what runs out on which
   day, and whether the basket already covers it.
6. Wrap up the week from `/week`. Assigned meals count as cooked; `/remix` then
   proposes next week as stories (a chain, a swap, something new, a cuisine the
   pantry can already cook).
7. `/kitchen` — the journey (Week 1 to 8, projected ahead from this household's
   choices) and the Blinkit lens.
8. [PRODUCT_CASE.md](PRODUCT_CASE.md) — opportunity, hypothesis, experiment and
   metrics.

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
 /start, /week, /checkout,      /kitchen (lens view)
 /, /pantry, /remix
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
| `/start` | Three-tap onboarding, or a lived-in sample kitchen |
| `/` | Today: tonight's dinner, what it uses up, what carries over |
| `/week` | Swipe planner for the week's dinners; wraps up the week |
| `/checkout` | Prototype basket of only what is missing |
| `/remix` | Between weeks: next week's changes as stories |
| `/pantry` | Pantry shelf and a dated timeline of run-outs and use-soon items |
| `/kitchen` | The household's eight-week journey and the Blinkit lens |

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
npm run test       # 148 unit tests across 19 files
npm run build
npm run test:e2e   # 6 Playwright tests; first time: npx playwright install chromium
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

## Interface

Seven phone screens, one primary action each. The household never reports
cooking: a meal assigned to a day counts as cooked when the week is wrapped up,
which is what moves the pantry forward. Copy describes outcomes ("3 of 6 at
home", "covered by this week's basket"), and mechanics stay in the engine.

Dishes are drawn as illustrated plates coloured by their main ingredient, and
each is marked "photo to come". Food photography and non-vegetarian recipes are
planned, not built: the non-veg diet is offered, but the catalog has no meat
recipes yet, so it currently sees the same dishes as veg. Simulated prices and
households are disclosed at checkout and in the lens.

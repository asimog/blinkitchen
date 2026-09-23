# Blinkitchen

Blinkitchen is a portfolio-grade prototype of a **longitudinal household grocery
intelligence layer**. Grocery apps understand carts and transactions. Blinkitchen
tries to understand the kitchen itself over time: what is already in the pantry,
what should be used soon, what a household actually cooks, what it wastes, what it
substitutes, and what it will need next.

Household facts are truth. Intelligence is derived. Simulation exercises the same
domain. Customer and Blinkit views are projections.

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
npm run test
npm run build
npm run test:e2e   # first time only: npx playwright install chromium
```

`npm run lint` runs two linters: the vendored
[anti-slop](https://github.com/dmmulroy/anti-slop) Oxlint rules (boundary
parsing, no assertion laundering, deterministic spacing) and ESLint.
`npm run lint:fix` applies the anti-slop whitespace autofix.

`npm run test:e2e` builds and serves a production build on port 3100, so stop
any running `npm run dev` first (Next.js allows only one dev server per project
folder).

## Where to start

| Surface | What it shows |
| --- | --- |
| `/` | The product thesis in one screen |
| `/explore` | Four simulated households, each replayable across Weeks 1–8 |
| `/explore/[id]` | One household's journey: week cards, pantry reuse, basket, learning |
| `/build` | Build your own household (stored only in your browser) |
| `/kitchen` | Your interactive household journey |
| `/blinkit` | Cohort-level intelligence across the simulated households (clearly labelled simulated) |

Everything in `/blinkit` and `/explore` is **simulated data**, not real Blinkit
users or demand. All prices, products and availability are fictional.

## Documentation

- [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md) — what we are building, for whom, what is out of scope
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the software is divided; what owns truth, what is derived
- [DATA_MODEL.md](DATA_MODEL.md) — KitchenState, Catalog, facts and derived projections
- [SIMULATION.md](SIMULATION.md) — the four households and the deterministic Week 1→8 loop
- [AGENTS.md](AGENTS.md) — rules for coding agents working in this repo

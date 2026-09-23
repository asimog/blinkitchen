# AGENTS.md

Rules for coding agents working in this repository.

## Non-negotiables

1. **One household authority.** `KitchenState` is the only household truth.
   Never add a second household, week, plan or learning model.
2. **Do not persist projections.** Recommendations, scores, baskets, coverage,
   chains, substitutions, replenishments, explanations and Blinkit insights are
   derived on demand. They must never be written to state or localStorage.
3. **Keep the core pure.** `src/domain`, `src/catalog`, `src/intelligence`,
   `src/simulation` and `src/insights` must not import React, browser APIs,
   `fs`, `fetch`, `Date.now()` or `Math.random()`. Pass time/ids explicitly.
4. **No auth, no database, no ecommerce.** No accounts, sessions, permissions,
   orders, checkout, payments, providers, inventory management or server APIs.
5. **One catalog seam.** Fixture JSON becomes a `Catalog` only in
   `src/catalog/load.ts`. Never load data files from components.
6. **Prefer deletion.** If a change adds a concept without removing two, stop and
   reconsider. No speculative abstractions, no repository/service layers.
7. **Determinism.** Simulation and intelligence must be reproducible: identical
   inputs, identical outputs. No randomness, no clocks, no locale dependence.

## Working method

- Run `npm run lint`, `npm run typecheck`, `npm run test` after changes.
- Run `npm run build` before handing off; `npm run test:e2e` for browser flows.
- Test the domain more heavily than the UI. New intelligence behaviour needs a
  test proving household behaviour changes the output.
- Update the authoritative docs (`ARCHITECTURE.md`, `DATA_MODEL.md`,
  `SIMULATION.md`, `PRODUCT_SCOPE.md`, `README.md`) when a contract changes.
  Do not create additional specification documents.
- Do not add dependencies without a strong reason; the stack is deliberately
  boring (Next.js App Router, React, TypeScript strict, Zod, Vitest, Playwright,
  lucide-react, plain CSS).
- Never commit secrets. Never commit generated artifacts that can drift.

## Error handling

Expected invalid operations (consuming more than stock, advancing past week 8,
unknown ingredient) return typed `{ ok: false, error: { code, message } }`
results. Never classify errors by matching message strings.

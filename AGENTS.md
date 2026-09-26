# AGENTS.md

Rules for coding agents working in this repository.

## What this project is

Blinkitchen is a product-management prototype of household grocery intelligence
for Blinkit: a working demonstration of the core mechanics, not a real product.
Optimise every change for making household intelligence visible, credible and
simple to understand.

## Non-negotiables

1. **One household authority.** `KitchenState` is the only household truth. Never
   add a second household, week, plan or learning model.
2. **Persist facts, derive intelligence.** Recommendations, scores, baskets,
   coverage, chains, substitutions, replenishments, explanations, learning and
   Blinkit insights are recomputed on demand, never written to state or
   localStorage.
3. **The catalog is read-only**, the only place recipes and products live. Recipes
   reference canonical ingredients, never SKUs; products reference ingredients.
4. **Keep the core pure.** `src/domain`, `src/catalog`, `src/intelligence`,
   `src/simulation` and `src/insights` must not import React, browser APIs, `fs`,
   `fetch`, `Date.now()` or `Math.random()`. Pass time and ids explicitly.
5. **Simulation uses the production paths.** Simulated weeks run the same domain
   commands and intelligence engine as the UI. No bypassing invariants.
6. **Never present simulated output as evidence** about real customers, demand or
   inventory. Keep simulation disclosure clear without repeating "simulated"
   beside every value.
7. **Prefer deterministic logic** where the answer is calculable. No randomness,
   clocks or locale dependence.
8. **No infrastructure without demonstrated product need.** No auth, database,
   server APIs, queues, event buses, runtime LLMs, embeddings, vector databases,
   microservices or repository layers.
9. **Prefer deletion.** If a change adds a concept without removing two, stop and
   reconsider.
10. **Keep current and planned behaviour explicit.** Never describe target
    behaviour as implemented.
11. **One catalog seam.** Fixture JSON becomes a `Catalog` only in
    `src/catalog/load.ts`. Never load data files from components.

## Product and UI rules

- Complexity belongs in the engine, not by default in the interface. A rich
  engine does not justify a dense screen.
- One primary action per screen; do not make every intelligence result compete for
  attention.
- Prefer progressive disclosure: the decision first, a short explanation on
  expand, mechanics only on request. Default to less copy.
- Customer-facing language describes outcomes ("68% already at home", "buy once,
  use in 3 meals"), not internal algorithms.
- Avoid adding panels or cards when hierarchy can communicate the same
  information.
- Future onboarding must not exceed three primary steps without explicit product
  justification.

## Working method

- Run `npm run lint`, `npm run typecheck` and `npm run test` after changes.
- Run `npm run build` before handing off; `npm run test:e2e` for browser flows.
- `npm run lint` includes the vendored anti-slop Oxlint ruleset
  (`tools/oxlint/anti-slop`, configured in `oxlint.config.ts`, installed and
  updated via the skill at `.kilo/skills/install-anti-slop`). Do not weaken,
  disable or launder around those rules: parse at the boundary, keep type
  evidence, and justify any necessary assertion with a `SAFETY:` comment.
  `npm run lint:fix` applies the whitespace autofix.
- Catalog data changes only through `tools/catalog-harvest`: harvest raw pages,
  normalise aliases, quantities and packs, then commit the generated
  `src/data/*.json`. Never copy recipe instruction prose into the catalog, and
  never fetch anything at runtime.
- Test the domain more heavily than the UI. New intelligence behaviour needs a
  test proving household behaviour changes the output.
- Update the authoritative docs when a contract changes: `README.md`,
  `PRODUCT_CASE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `SIMULATION.md`,
  `IMPLEMENTATION_PLAN.md`. Do not create additional specification documents.
- Do not add dependencies without a strong reason; the stack is deliberately
  boring (Next.js App Router, React, TypeScript strict, Zod, Vitest, Playwright,
  lucide-react, plain CSS).
- Never commit secrets or generated artifacts that can drift.

## Installed skills

Skills provide guidance only and never authorise architectural expansion,
dependencies, services or scope growth. Repository rules take precedence.
Vendored here: `install-anti-slop`, `nextjs`, `product-design-audit`,
`frontend-testing-debugging`, `verification-before-completion`. Use
`verification-before-completion` before claiming a task is complete.

## Error handling

Expected invalid operations (consuming more than stock, advancing past week 8,
unknown ingredient) return typed `{ ok: false, error: { code, message } }`
results. Never classify errors by matching message strings.

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
   Blinkit insights are recomputed on demand and never written to state or
   localStorage.
3. **The catalog is read-only**, and it is the only place recipes and products
   live. Recipes reference canonical ingredients, never SKUs. Products reference
   ingredients.
4. **Keep the core pure.** `src/domain`, `src/catalog`, `src/intelligence`,
   `src/simulation` and `src/insights` must not import React, browser APIs, `fs`,
   `fetch`, `Date.now()` or `Math.random()`. Pass time and ids explicitly.
5. **Simulation uses the production paths.** Simulated weeks run the same domain
   commands and the same intelligence engine as the UI. No bypassing invariants.
6. **Never present simulated output as evidence** about real customers, demand or
   inventory. Keep simulation disclosure clear without repeating the word
   "simulated" beside every value.
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

- Complexity belongs in the engine, not by default in the interface. A rich engine
  does not justify a dense screen.
- One primary action per screen. Do not make every intelligence result compete for
  attention.
- Do not expose an engine field merely because it exists. Compose the projections
  the current decision needs.
- Prefer progressive disclosure: the decision first, a short explanation on
  expand, scoring and mechanics only on request.
- Default to less copy. Explainability stays available, not always visible.
- Customer-facing language describes outcomes ("68% already at home", "buy once,
  use in 3 meals"), not internal algorithms ("substitution affinity",
  "chain potential").
- Avoid adding panels or cards when hierarchy can communicate the same
  information.
- Future onboarding must not exceed three primary steps without explicit product
  justification.

## Working method

- Run `npm run lint`, `npm run typecheck`, `npm run test` after changes.
- Run `npm run build` before handing off; `npm run test:e2e` for browser flows.
- `npm run lint` includes the vendored anti-slop Oxlint ruleset
  (`tools/oxlint/anti-slop`, configured in `oxlint.config.ts`, installed and
  updated via the skill at `.kilo/skills/install-anti-slop`). Do not weaken,
  disable or launder around those rules: parse at the boundary, keep type
  evidence, and justify any necessary assertion with a `SAFETY:` comment.
  `npm run lint:fix` applies the whitespace autofix.
- Test the domain more heavily than the UI. New intelligence behaviour needs a
  test proving household behaviour changes the output.
- Update the authoritative docs when a contract changes: `README.md`,
  `PRODUCT_SCOPE.md`, `PRODUCT_CASE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`,
  `DATA_STRATEGY.md`, `SIMULATION.md`, `IMPLEMENTATION_PLAN.md`. Do not create
  additional specification documents.
- Do not add dependencies without a strong reason; the stack is deliberately
  boring (Next.js App Router, React, TypeScript strict, Zod, Vitest, Playwright,
  lucide-react, plain CSS).
- Never commit secrets. Never commit generated artifacts that can drift.

## Installed skills

Installed skills provide implementation and review guidance only. They do not
authorise architectural expansion, dependencies, services, planning documents or
scope growth. Repository rules always take precedence.

- Use `systematic-debugging` for bugs, failed tests, unexpected behaviour, build
  failures and regressions. Reproduce the root cause before changing production
  code.
- Use `verification-before-completion` before claiming a task is complete: run the
  applicable tests plus `npm run lint`, `npm run typecheck`, `npm run test`,
  `npm run build`, and `npm run test:e2e` when browser-facing behaviour changed.

## Error handling

Expected invalid operations (consuming more than stock, advancing past week 8,
unknown ingredient) return typed `{ ok: false, error: { code, message } }`
results. Never classify errors by matching message strings.
# Simulation

## Purpose

The simulation generates repeatable demonstrations of Weeks 1 to 8 for four
household archetypes. It exists so a reviewer can watch intelligence accumulate
without hand-clicking eight weeks four times.

It is **not** a second domain. It produces real state transitions using the same
commands available to the interactive prototype:

```ts
simulateJourney(startingKitchen, catalog, policy, weeks = 8): KitchenState[]

type JourneyPolicy = (
  kitchen: KitchenState,
  catalog: Catalog,
  intelligence: WeekIntelligence,
) => KitchenCommand[];
```

Each week: build intelligence, the policy emits commands, and the commands are
applied through `applyKitchenCommand`. Nothing bypasses domain invariants.

## The four archetypes

They are **not** four algorithms. They are four different inputs (preference
vectors, pantry seeds, budgets, locations, cooking frequency) driving the same
engine. The only policy-level parameter is the substitution acceptance threshold,
and it is derived from the profile rather than hard-coded per archetype.

| Archetype | Household | Location | People | Budget | Cook days | Planning | Price | Convenience | Exploration | Pantry seed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pantry Planner | The Mehtas | delhi_south | 4 | ₹1650 | 6 | 0.92 | 0.55 | 0.28 | 0.18 | 11 items |
| Cuisine Explorer | The Khannas | delhi_south | 3 | ₹1900 | 5 | 0.58 | 0.42 | 0.42 | 0.94 | 7 items |
| Value Optimizer | The Sharmas | delhi_central | 4 | ₹1300 | 6 | 0.76 | 0.96 | 0.30 | 0.25 | 6 items |
| Convenience Household | The Iyers | delhi_central | 2 | ₹1750 | 3 | 0.25 | 0.45 | 0.96 | 0.36 | 6 items |

All four fixtures are vegetarian, matching the catalog's current dietary coverage.

Expected emergent differences:

- Pantry Planner: higher pantry utilisation, smaller incremental baskets, strong
  ingredient chaining.
- Cuisine Explorer: discovery meals surface, cuisine affinity shifts as meals
  accumulate.
- Value Optimizer: lower-cost baskets, more accepted substitutions.
- Convenience Household: simpler, shorter meals, fewer ingredients per plan.

## The weekly loop

```text
Week N intelligence (pure engine)
      ↓
policy selects the suggested meals
      ↓
policy decides substitutions: threshold = 0.90 − 0.50 × priceSensitivity
      ↓
policy projects its own decisions through the same domain and engine
      (so what it buys matches what the UI would show for those choices)
      ↓
receive the simulated basket (grocery facts)
      ↓
cook the planned meals: consume effective requirements, then meal facts
      ↓
waste use-soon items the plan could not rescue (consumption facts)
      ↓
complete the week, advance to N+1
```

Week 8 is terminal: completing it leaves the kitchen at week 8 with the week
marked complete, and further commands are rejected with a typed error code.
`simulateJourney` is prefix-consistent: a four-week run equals the first four
states of a full run.

## Determinism

Given identical fixtures and code, a run today and a run tomorrow produce
byte-identical state. There is no `Math.random()`, no `Date.now()`, no
environment-dependent behaviour in the domain, intelligence or simulation. Fact
ids are derived from week, index and content, not clocks. Product availability
comes from a deterministic signature over `templateId:locationId`.

Tests enforce this: two independent simulations are deep-equal, all four
archetypes complete eight weeks, and archetype outcomes differ meaningfully
(basket cost, coverage, substitution acceptance, waste).

## Simulation assumptions

The simulation is a deterministic behavioural sandbox. It demonstrates product
mechanics under encoded assumptions. It is **not** evidence about real users.

Each assumption below is real code, verified in `src/simulation/policies.ts`,
`src/intelligence/meals.ts` and `src/intelligence/learning.ts`.

| Assumption | Prototype behaviour | Real-world question |
| --- | --- | --- |
| Higher price sensitivity means more willingness to swap | Acceptance threshold is `0.90 − 0.50 × priceSensitivity`, so the Value Optimizer (0.96) accepts swaps the Convenience Household (0.45) rejects | Does real substitution acceptance vary with price sensitivity, and at what threshold? |
| Higher planning preference means pantry and use-soon signals matter more | `pantryFit × (0.6 + 0.4 × planning)` and `useSoonBenefit × (0.5 + 0.5 × planning)` | Does pantry-conscious planning improve engagement, basket quality and retention? |
| Higher exploration preference means more discovery | Discovery recipes gain in `cuisineFit`; at `explorationPreference >= 0.7` the last plan slot is forced to a discovery meal | Does observed exploration match stated preference? |
| Higher convenience preference means simpler, faster meals | `convenience` factor sharpens with `0.6 + 1.4 × convenienceEvidence` and multiplies by a complexity factor | Do convenience-first households actually cook simpler meals more often? |
| Low waste tolerance is expressed through planning | There is no separate waste parameter: planning raises use-soon benefit, and the policy wastes only use-soon items the plan did not rescue | Does use-soon ranking reduce real spoilage? |
| Stated preferences are a reasonable starting prior | Affinity starts from the profile and blends 50/50 with observed behaviour once facts exist | How quickly, and how much, should observed behaviour override stated preference? |

The chain to keep in mind:

```text
Simulation assumption → expected prototype behaviour → product hypothesis
    → real-world experiment required
```

For example, "the Value Optimizer accepts more substitutions" is a consequence of
the threshold formula. It does not show that price-sensitive Blinkit customers
accept more substitutions.

## How learning accumulates (the intended arc)

```text
Week 1  Understand the kitchen (baseline, stated preferences and starting pantry)
Week 2  First recommendations settle; first meals recorded
Week 3  Choices are observed; affinity starts moving
Week 4  Recommendations adapt to what the household actually cooks
Week 5  Replenishment patterns emerge from consumption facts
Week 6  Substitution and cuisine behaviour strengthen
Week 7  Recommendations feel household-specific
Week 8  The journey summarises what Blinkitchen learned
```

There is no separate learning state. `deriveLearning(kitchen, catalog)` recomputes
everything from facts each week; the arc emerges from accumulating facts.

## What simulation demonstrates

- Pantry state changes basket composition week over week.
- Household history changes recommendation inputs.
- Explicit substitution decisions change future swap ranking.
- Repeated consumption can create replenishment signals.
- Different household inputs produce different journeys through one engine.
- The whole loop is deterministic and reproducible.

## What simulation cannot validate

- Whether real customers will provide household context.
- Whether real households want pantry-aware baskets.
- Whether relevance improves conversion, frequency or retention.
- Whether any archetype corresponds to a real customer segment.
- Whether the encoded thresholds (0.90, 0.50, 0.7, 1.5 weeks) match real
  behaviour. They are design choices, not findings.

## Reproducing a run

The `/explore` surfaces replay a journey by calling `simulateJourney` for the
selected archetype and rendering the resulting states. "Advance one week"
simulates one more state, "Replay to Week 8" simulates the full journey, and
"Reset" discards the in-memory states. Nothing about a simulated household is
persisted.

## Planned: a compact Week 1 to Week 8 comparison

The product thesis is longitudinal, but a reviewer should not have to interpret
eight dense screens manually. The target experience adds one compact comparison
surface (what Week 1 knew versus what Week 8 learned) so longitudinal change is
visible at a glance, with the weekly detail still available by drill-down. The
diagram, acceptance criteria and sequencing are in
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), Phase 4.
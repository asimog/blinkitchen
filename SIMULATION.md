# Simulation

## Purpose

The simulation generates repeatable demonstrations of Weeks 1–8 for four
household archetypes. It exists so a reviewer can watch intelligence accumulate
without hand-clicking eight weeks four times.

The simulation is **not** a second domain. It produces real state transitions
using the same commands available to the interactive prototype:

```ts
simulateJourney(startingKitchen, catalog, policy): KitchenState[]
```

where `policy` is a pure function:

```ts
type JourneyPolicy = (
  kitchen: KitchenState,
  intelligence: WeekIntelligence,
) => KitchenCommand[];
```

Each week: build intelligence → policy emits commands → commands applied through
`applyKitchenCommand`. Nothing bypasses domain invariants.

## The four archetypes

They are **not** four algorithms. They are four different inputs (preference
vectors, pantry seeds, budgets, locations) driving the same engine. The only
policy-level differences are decision thresholds (for example how readily
substitutions are accepted), which are themselves derived from the profile.

| Archetype | Household | Location | People | Budget | Character |
| --- | --- | --- | --- | --- | --- |
| Pantry Planner | The Mehtas | delhi_south | 4 | ₹1650 | high planning, high pantry awareness, low waste tolerance, strong reuse |
| Cuisine Explorer | The Khannas | delhi_south | 3 | ₹1900 | high exploration, multiple cuisines, tries unfamiliar dishes |
| Value Optimizer | The Sharmas | delhi_central | 4 | ₹1300 | high price sensitivity, high substitution acceptance |
| Convenience Household | The Iyers | delhi_central | 2 | ₹1750 | high convenience, shorter preparation, lower planning |

Expected emergent differences: higher pantry utilisation and ingredient chaining
for the Pantry Planner; more discovery meals and shifting cuisine affinity for the
Explorer; lower-cost baskets and more accepted substitutions for the Value
Optimizer; simpler, fewer-ingredient meals for the Convenience Household.

## The weekly loop

```text
Week N intelligence (pure engine)
      ↓
policy selects the suggested meals
      ↓
policy decides substitutions: threshold = 0.90 − 0.50 × priceSensitivity
      ↓
policy projects its own decisions through the same domain + engine
      (so the basket it buys matches the UI exactly)
      ↓
receive simulated basket (grocery facts)
      ↓
cook planned meals: consume effective requirements, then meal facts
      ↓
waste use-soon items the plan could not rescue (consumption facts)
      ↓
complete week → advance to N+1
```

Week 8 is terminal: completing it leaves the kitchen at week 8 with the week
marked complete. Further commands are rejected with a typed error code.
`simulateJourney(start, catalog, policy, weeks = 8)` returns one state per week
and is prefix-consistent: a four-week run equals the first four states of a full
run. The acceptance threshold formula is the only policy-level parameter that
differs between archetypes, and it is derived from the profile, not hard-coded
per archetype.

## Determinism

Given identical fixtures and code, a run today and a run tomorrow produce
byte-identical state. There is no `Math.random()`, no `Date.now()`, no
environment-dependent behaviour in the domain, intelligence or simulation. Fact
ids are derived from week, index and content, not clocks. Product availability
comes from a deterministic signature over `templateId:locationId`.

Tests enforce this: two independent simulations are deep-equal, all four
archetypes complete eight weeks, and archetype outcomes differ meaningfully
(basket cost, coverage, substitution acceptance, waste).

## How learning accumulates (the intended arc)

```text
Week 1  Understand the kitchen (baseline, pantry-first)
Week 2  First recommendations become visible
Week 3  Choices are observed; affinity starts moving
Week 4  Recommendations adapt to what the household actually cooks
Week 5  Replenishment patterns emerge from consumption facts
Week 6  Substitution and cuisine preferences strengthen
Week 7  Recommendations feel household-specific
Week 8  The journey summarises what Blinkitchen learned
```

There is no separate learning state. `deriveLearning(kitchen)` recomputes
everything from facts each week; the arc emerges from accumulating facts.

## Reproducing a run

The `/explore` UI replays a journey by calling `simulateJourney` for the selected
archetype and rendering the resulting states. "Advance one week" simulates one
more state; "Replay to Week 8" simulates the full journey; "Reset" discards the
in-memory states. Nothing about the simulated households is persisted.

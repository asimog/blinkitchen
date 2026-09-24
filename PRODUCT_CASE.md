# Product Case

A product-management case for household grocery intelligence at Blinkit, backed by
a working prototype. All metrics here are **proposed measurements**. The prototype
has collected none of them, and no simulated output is customer evidence.

## Opportunity

Quick-commerce grocery in India has solved speed and availability. The next layer
of advantage is relevance: understanding what a household actually needs this
week. Today's context is thin and largely transactional:

```text
search → product impression → cart → transaction → reorder
```

A recipe or product recommendation can be shown to a household that already owns
most of the required ingredients, or that never cooks the cuisine being
suggested, and the system has no way to know.

## User problem

The customer problem is weekly and repetitive, not one-off:

- "What can we cook from what is already at home?"
- "What should be used before it spoils?"
- "What do we actually need to buy?"
- "We keep running out of the same things."

Purchase history cannot answer these. It records what was bought, not what
remains, what was consumed, what was wasted, what it was cooked in, or what is
about to run out.

## Product hypothesis

> A lightweight household model could improve grocery relevance by combining
> pantry state, cooking behaviour and longitudinal consumption signals.

And the corollary that shapes the whole design:

> Household intelligence only creates value if obtaining household context is
> cheap enough. Blinkitchen must progressively earn its household model rather
> than demand it upfront.

## Why transaction history is not kitchen state

| Question | Transaction history | Kitchen state |
| --- | --- | --- |
| What is at home now? | Unknown | Pantry stock by ingredient and unit |
| Was it consumed or wasted? | Unknown | Consumption facts with kind used or wasted |
| Which meals used it? | Unknown | Meal facts tied to recipes |
| Is a swap acceptable here? | Unknown | Explicit accept and reject decisions |
| Is this a household staple? | Weak proxy (repeat purchases) | Usage and replenishment frequency over weeks |
| What is about to run out? | Unknown | Remaining stock against observed burn |

Transaction history is a demand log. Kitchen state is a supply and behaviour
model. They are different data, and the second one is what makes a plan
actionable.

## Target user and initial market

- Initial context: Delhi and NCR, matching the prototype's two simulated
  locations and the cuisine data (Punjabi, North Indian, Indo-Chinese, plus a
  discovery slot).
- Initial user: quick-commerce grocery customers who cook at home several days a
  week, typically 2 to 4 person households, with a recognisable weekly budget.
- Households with high pantry awareness and price sensitivity are the strongest
  early candidates, because the value shows up immediately in the basket.

## MVP scope

The MVP is deliberately narrow:

1. A three-step onboarding that captures household size, diet, location, budget,
   cuisines, a broad cooking frequency and 1 to 2 priorities, plus a light pantry
   starting point.
2. A weekly plan of 3 to 5 meals that starts from what is already home.
3. A pantry-aware basket that only fills real gaps.
4. Ingredient reuse made visible: "buy once, use in 3 meals".
5. Substitutions offered only from explicit relationships, ranked by household
   history.
6. Replenishment prompts from observed usage.
7. A learning summary of what changed.

Out of scope for the MVP: checkout, ordering, delivery, accounts, payments,
provider integrations and real pricing.

## Customer value

| Value | Mechanism |
| --- | --- |
| Fewer unnecessary purchases | Basket subtracts pantry stock before buying |
| Less planning effort | Meals start from current stock and stated preferences |
| Less waste | Use-soon items ranked into the plan; spoilage recorded as a fact |
| More relevant meals | Observed cuisine, complexity and cost behaviour shifts ranking |
| Better substitutions | Accepted and rejected swaps adjust future swap ranking |
| Smarter replenishment | Usage frequency and remaining stock create prompts |

These are expected product benefits, not measured outcomes.

## Potential Blinkit value

- More relevant recommendations from household context instead of basket history.
- Stronger recipe-to-basket usefulness: a recipe becomes a buyable list minus
  what is already home.
- Context-aware cross-sell: ingredients that complete multiple meals in the
  household's own plan.
- Better replenishment timing from observed burn rather than generic cadence.
- Better substitution ranking, since acceptance is household-specific.
- Household-aware merchandising and pack-size selection.
- A richer picture of recurring demand by household, not just by SKU.
- Potentially stronger trust and retention if the experience feels accurate.

## Business tension: smaller but more relevant baskets

Pantry awareness can reduce immediate basket value. It removes purchases the
household does not need.

```text
Conventional recipe requirement   ₹900
Already in the kitchen            ₹250
Kitchen-aware purchase            ₹650
```

The immediate basket is smaller. The product question is whether improved
relevance and trust create enough benefit through conversion, frequency,
retention, category penetration and useful attach to offset the removed spend.
This tension should be measured, not assumed away. It is also a guardrail: an
experience that consistently shrinks baskets without improving repeat behaviour
is not working.

## Key assumptions

| # | Assumption | Prototype behaviour today | How it would be tested |
| --- | --- | --- | --- |
| 1 | Households will provide enough context for a useful Week 1 | Five-step wizard exists; no real users have used it | Onboarding completion and time-to-Week-1 in a pilot |
| 2 | Pantry state changes what is bought | Basket subtracts pantry stock before pack sizing | Treatment versus control basket composition |
| 3 | Observed behaviour is a better signal than stated preference | Cuisine affinity blends profile and cooked meals | Recommendation acceptance as facts accumulate |
| 4 | Substitution acceptance is household-specific | Affinity shifts on accept/reject, ranked with compatibility | Swap acceptance rate by household over time |
| 5 | Replenishment signals arrive before the household notices | Heuristic from usage frequency and remaining stock | Prompt acceptance and stockout avoidance |
| 6 | Relevance outweighs the smaller immediate basket | Not modelled in the prototype | Retention, frequency and basket value over 4+ weeks |

## Onboarding friction is the primary product risk

More context improves recommendations. Asking for too much context destroys
adoption. The current prototype asks for a name, four abstract 0..1 sliders, a
per-ingredient pantry inventory and a review step. That is more than the target
product should require.

The target is three short steps in about a minute, with minimal typing and no
inventory precision. Onboarding completion is therefore a first-class metric and a
guardrail, not a vanity number.

## Why progressive learning matters

```text
NEEDED NOW          ask during onboarding
CAN BE LEARNED      infer from later household behaviour
CAN BE CORRECTED    allow later without blocking onboarding
```

Needed now: diet, household size, broad cooking behaviour, enough kitchen context
to produce a useful Week 1.

Learned later: true cuisine affinity, household staples, replenishment cadence,
substitution preferences, repeated meals, waste patterns and real convenience or
price behaviour.

Corrected later: pantry quantities, forgotten ingredients, budget changes,
preference changes and unusual weeks.

Approximate useful state is better than onboarding abandonment caused by inventory
precision.

## Experiment proposal

**Population**: eligible grocery customers willing to establish lightweight
household context, in one Delhi or NCR service area.

**Control**: existing recipe or product recommendation experience.

**Treatment**: kitchen-state-aware meals, pantry-aware basket, household-ranked
substitutions and replenishment prompts.

**Design**: randomised between-customer test over at least 4 weeks, with
onboarding completion measured in the first session and retention measured across
four weekly cycles.

**Simulation role**: the prototype is not the experiment. It demonstrates the
mechanics and generates the hypotheses; see [SIMULATION.md](SIMULATION.md).

### Primary metrics (proposed)

- Onboarding completion rate.
- Meal recommendation acceptance.
- Plan-to-basket conversion.
- Recommended basket add rate.
- Replenishment prompt acceptance.
- Substitution acceptance.
- Repeated household-intelligence usage.
- 4-week return and retention.

### Customer-value diagnostics (proposed)

- Pantry coverage of the plan ("68% already at home").
- Use-soon items rescued before spoilage.
- Redundant purchase avoidance.
- Pantry correction frequency (how often inferred state is wrong).
- Recommendation dismissal rate.

### Business metrics (proposed)

- Order conversion.
- Order frequency.
- Retention.
- Category penetration.
- Useful incremental attach.
- Contribution margin where relevant.

### Guardrails (proposed)

- Onboarding abandonment.
- Excessive correction burden.
- Recommendation irrelevance or dismissal.
- Excessive immediate basket reduction without repeat behaviour.
- Customer distrust (a wrong pantry assumption is worse than no assumption).
- Stale inferred kitchen state.
- Latency: household context must not slow the shopping flow.

## Risks and mitigation

| Risk | Mitigation |
| --- | --- |
| Onboarding abandonment | Three steps, sensible defaults, optional naming, approximate pantry entry |
| Wrong or stale kitchen state | Show what the system believes, make correction cheap, decay stale inference |
| Recommendation irrelevance | Keep a control group; measure dismissal and acceptance separately |
| Basket value erosion | Treat immediate basket reduction as a guardrail paired with retention and frequency |
| Privacy concerns | Household facts stay local in the prototype; any production design needs explicit consent and transparency |
| Data quality | Canonical ingredients and validated recipes before scale; see [DATA_STRATEGY.md](DATA_STRATEGY.md) |
| Overclaiming | Simulation is labelled; mechanics and hypotheses are documented separately |

## What the prototype demonstrates

Verified behaviour in the current code:

1. Pantry state changes basket composition: requirements are aggregated, pantry
   stock is subtracted, and only gaps are priced and packed.
2. Household history changes recommendation inputs: cuisine affinity, price
   evidence, convenience evidence and exploration tendency are derived from facts.
3. Explicit substitution decisions change future swap ranking: accepted and
   rejected swaps move an affinity score.
4. Repeated consumption can create replenishment signals: usage across recent
   weeks plus low remaining stock produces a prompt.
5. Different household inputs produce different journeys through the same engine:
   four fixtures, one policy, eight deterministic weeks.
6. Meals and baskets explain themselves from the same facts that produced them.

## What it does not prove

- That real customers will complete household onboarding.
- That real customers want pantry-aware baskets.
- That relevance improves retention or lifetime value.
- That observed substitution behaviour matches stated price sensitivity.
- That any simulated archetype difference corresponds to real segments.
- That the current engine optimises a week as a whole; it ranks meals
  individually and detects chains afterwards.

## What a successful pilot could lead to

- Household context as a reusable Blinkit capability across recipes, search and
  replenishment, not a standalone feature.
- A pantry-aware recipe-to-basket surface as the first shipped experience.
- Replenishment prompts as a recurring, low-effort retention loop.
- Household-level demand understanding feeding assortment, pack sizes and
  merchandising.
- A measured answer to the basket-tension question, either way.
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
most of the required ingredients, or that never cooks the cuisine being suggested,
and the system has no way to know. Audience: a Blinkit product or strategy
reviewer judging whether household context is a credible opportunity, and a
product or engineering reviewer judging the prototype as a working deterministic
system. Initial context: Delhi and NCR, matching the prototype's two simulated
locations and cuisine data, with 2 to 4 person households that cook at home
several days a week.

## User problem

The customer problem is weekly and repetitive, not one-off: "What can we cook from
what is already at home?", "What should be used before it spoils?", "What do we
actually need to buy?", "We keep running out of the same things." Purchase history
cannot answer these. It records what was bought, not what remains, what was
consumed, what was wasted, what it was cooked in, or what is about to run out.

## Product hypothesis

> A lightweight household model could improve grocery relevance by combining
> pantry state, cooking behaviour and longitudinal consumption signals.

And the corollary that shapes the whole design:

> Household intelligence only creates value if obtaining household context is
> cheap enough. Blinkitchen must progressively earn its household model rather
> than demand it upfront.

## The longitudinal loop

```text
Onboarding → kitchen state (facts) → understand pantry and household facts
    → recommend meals → pantry-aware weekly plan → missing-only basket
    → reuse ingredients across meals → substitutions, purchases, cooking,
      consumption, waste → learn household behaviour → replenishment signals
    → next week's recommendations improve
```

The value is not "Week 1 gives a good recipe". It is that the grocery experience
becomes increasingly household-specific as facts accumulate.

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

Households with high pantry awareness and price sensitivity are the strongest
early candidates, because the value shows up immediately in the basket.

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

More relevant recommendations from household context rather than basket history;
stronger recipe-to-basket usefulness (a recipe becomes a buyable list minus what
is already home); context-aware cross-sell of ingredients that complete multiple
meals in the household's own plan; better replenishment timing from observed burn
rather than generic cadence; household-specific substitution ranking;
household-aware merchandising and pack-size selection; a richer picture of
recurring demand by household, not just by SKU; and potentially stronger trust
and retention if the experience feels accurate.

## Business tension: smaller but more relevant baskets

Pantry awareness can reduce immediate basket value by removing purchases the
household does not need: a conventional recipe requirement might be ₹900, ₹250 is
already in the kitchen, and the kitchen-aware purchase is ₹650. The immediate
basket is smaller. The product question is whether improved relevance and trust
create enough benefit through conversion, frequency, retention, category
penetration and useful attach to offset the removed spend. This tension should be
measured, not assumed away, and it is a guardrail: an experience that consistently
shrinks baskets without improving repeat behaviour is not working.

## Key assumptions

| # | Assumption | Prototype behaviour today | How it would be tested |
| --- | --- | --- | --- |
| 1 | Households will provide enough context for a useful Week 1 | Three-step wizard with quick picks; no real users have used it | Onboarding completion and time-to-Week-1 in a pilot |
| 2 | Pantry state changes what is bought | Basket subtracts pantry stock before pack sizing | Treatment versus control basket composition |
| 3 | Observed behaviour is a better signal than stated preference | Cuisine affinity blends profile and cooked meals | Recommendation acceptance as facts accumulate |
| 4 | Substitution acceptance is household-specific | Affinity shifts on accept/reject, ranked with compatibility | Swap acceptance rate by household over time |
| 5 | Replenishment signals arrive before the household notices | Heuristic from usage frequency and remaining stock | Prompt acceptance and stockout avoidance |
| 6 | Relevance outweighs the smaller immediate basket | Not modelled in the prototype | Retention, frequency and basket value over 4+ weeks |

## Onboarding friction is the primary product risk

More context improves recommendations. Asking for too much context destroys
adoption. The prototype now asks for three short steps — household, how you eat,
your kitchen — with quick picks instead of sliders or an inventory, in about a
minute. Whether that is still too much is the first thing a pilot must answer.
Onboarding completion is therefore a first-class metric and a guardrail.

## Progressive learning

```text
NEEDED NOW          ask during onboarding
CAN BE LEARNED      infer from later household behaviour
CAN BE CORRECTED    allow later without blocking onboarding
```

Needed now: diet, household size, broad cooking behaviour, enough kitchen context
for a useful Week 1. Learned later: true cuisine affinity, household staples,
replenishment cadence, substitution preferences, repeated meals, waste patterns
and real convenience or price behaviour. Corrected later: pantry quantities,
forgotten ingredients, budget changes, preference changes and unusual weeks.
Approximate useful state is better than onboarding abandonment caused by
inventory precision.

## Product principles

The target interface follows these. They do not all describe the current UI yet.

1. **Reviewer path first.** A reviewer reaches the simulated 8-week journey
   without completing onboarding.
2. **Ask less upfront.** Capture only household size, diet, location, budget,
   broad cooking behaviour and a light kitchen starting point.
3. **Three-step onboarding.** No more than three primary steps without explicit
   product justification.
4. **Learn progressively, correct later.** Preferences are inferred from facts;
   pantry, budget and preferences stay editable.
5. **One primary job per screen.** Home explains, onboarding starts the household,
   the week decides, learning explains, the Blinkit Lens frames the opportunity.
6. **Insight before mechanics, action before analysis.** The decision first
   ("82% already at home"), scoring behind "Why this?".
7. **Progressive disclosure.** Default: the decision. Expand: a short explanation.
   Deep detail: mechanics on request.
8. **The interface stays simpler than the engine.** Complexity belongs in the
   engine.

## Experiment proposal

**Population**: eligible grocery customers willing to establish lightweight
household context, in one Delhi or NCR service area.
**Control**: existing recipe or product recommendation experience.
**Treatment**: kitchen-state-aware meals, pantry-aware basket, household-ranked
substitutions and replenishment prompts.
**Design**: randomised between-customer test over at least 4 weeks, with
onboarding completion measured in the first session and retention across four
weekly cycles.
**Simulation role**: the prototype is not the experiment. It demonstrates the
mechanics and generates the hypotheses; see [SIMULATION.md](SIMULATION.md).

### Metrics (proposed)

- **Primary**: onboarding completion; meal recommendation acceptance;
  plan-to-basket conversion; recommended basket add rate; replenishment prompt
  acceptance; substitution acceptance; repeated household-intelligence usage;
  4-week return and retention.
- **Customer-value diagnostics**: pantry coverage of the plan ("68% already at
  home"); use-soon items rescued before spoilage; redundant purchase avoidance;
  pantry correction frequency; recommendation dismissal rate.
- **Business**: order conversion; order frequency; retention; category
  penetration; useful incremental attach; contribution margin where relevant.
- **Guardrails**: onboarding abandonment; excessive correction burden;
  recommendation irrelevance or dismissal; excessive immediate basket reduction
  without repeat behaviour; customer distrust (a wrong pantry assumption is worse
  than no assumption); stale inferred kitchen state; latency in the shopping flow.

### Measurement definitions (for a real deployment)

The prototype stays uninstrumented. A pilot would emit one event per primary
metric; these definitions exist so the metrics are measurable without changing
the product mechanics.

| Event | Trigger | Key properties |
| --- | --- | --- |
| `onboarding_step_completed` | A household finishes step 1, 2 or 3 | step index, duration, diet, cuisine count, pantry item count |
| `onboarding_completed` | "Start Week 1" succeeds | total duration, priorities chosen, pantry item count, started-empty flag |
| `plan_meal_accepted` | A suggested meal is added to the plan | household id, recipe id, plan slot, week |
| `plan_meal_dismissed` | A ranked meal is skipped | household id, recipe id, rank, week |
| `basket_line_added` | A recommended line is accepted into the basket | household id, ingredient id, line cost, coverage status |
| `swap_decided` | A substitution suggestion is accepted or rejected | substitution id, accepted flag, week |
| `replenishment_prompt_decided` | A restock prompt is accepted or dismissed | ingredient id, weeks of use left |
| `pantry_corrected` | A household edits inferred pantry state | ingredient id, inferred vs corrected quantity |
| `week_completed` | A week is closed | week number, meals cooked, basket total, coverage |
| `journey_returned` | The household opens the week view again | days since last visit, week number |

Onboarding completion, correction burden and pantry coverage are first-class
signals, not vanity numbers: they determine whether the progressive-learning
hypothesis is even testable.

## Risks and mitigation

| Risk | Mitigation |
| --- | --- |
| Onboarding abandonment | Three steps, sensible defaults, optional naming, approximate pantry entry |
| Wrong or stale kitchen state | Show what the system believes, make correction cheap, decay stale inference |
| Recommendation irrelevance | Keep a control group; measure dismissal and acceptance separately |
| Basket value erosion | Treat immediate basket reduction as a guardrail paired with retention and frequency |
| Privacy concerns | Household facts stay local in the prototype; production needs consent and transparency |
| Data quality | Canonical ingredients and validated recipes before scale; see [DATA_MODEL.md](DATA_MODEL.md) |
| Overclaiming | Simulation is labelled; mechanics and hypotheses documented separately |

## What the prototype demonstrates

Verified behaviour in the current code:

1. Pantry state changes basket composition: requirements are aggregated, pantry
   stock is subtracted, only gaps are priced and packed, and pack choice
   minimises total cost across the week.
2. Household history changes recommendation inputs: cuisine affinity, price
   evidence, convenience evidence and exploration tendency are derived from facts.
3. The weekly plan is chosen against the partial plan — shared ingredients,
   use-soon rescue, cuisine variety and incremental cost — not just by ranking
   meals individually, and every planned meal carries a derived explanation.
4. Optional ingredient lines never block a recipe and are never auto-purchased.
5. Explicit substitution decisions change future swap ranking.
6. Repeated consumption can create replenishment signals.
7. Different household inputs produce different journeys through the same engine:
   four fixtures, one policy, eight deterministic weeks.
8. Meals, baskets and the Week 1 to Week 8 comparison explain themselves from the
   same facts that produced them.

## What it does not prove

- That real customers will complete household onboarding or want pantry-aware
  baskets, or that relevance improves retention and lifetime value.
- That observed substitution behaviour matches stated price sensitivity.
- That any simulated archetype difference corresponds to a real segment.
- That the current engine optimises a week as a whole; it ranks meals
  individually and detects chains afterwards.
- That diets beyond vegetarian and vegan behave as the product intends; that
  work is deferred by scope (see [DATA_MODEL.md](DATA_MODEL.md)).

## What a successful pilot could lead to

Household context as a reusable Blinkit capability across recipes, search and
replenishment; a pantry-aware recipe-to-basket surface as the first shipped
experience; replenishment prompts as a recurring retention loop; household-level
demand understanding feeding assortment and pack sizes; and a measured answer to
the basket-tension question, either way.

## Simulation honesty

All products, prices, availability, households and aggregate outcomes are
simulated. Simulation demonstrates product mechanics under encoded assumptions; it
is not evidence about real Blinkit customers, demand or inventory. See
[SIMULATION.md](SIMULATION.md).

Repository: https://github.com/asimog/blinkitchen

Work from the current `main` branch.

# TASK MODE

This is a DOCUMENTATION-ONLY task.

Do not modify application code, tests, JSON datasets, package files, configuration,
styles, components, schemas, types, intelligence logic, simulation logic, or any
other executable file.

You may only edit Markdown documentation files and create the specific Markdown
documents expressly authorized in this prompt.

Do not implement any planned functionality.

Do not make code changes even if you discover implementation problems.

Instead:
- verify the implementation;
- document the current behavior accurately;
- identify current limitations;
- document the intended future direction.

# FIRST ACTION: SAVE THIS ENTIRE PROMPT

Before editing any existing documentation:

1. Record the current HEAD SHA.
2. Create:

   `DOCUMENTATION_MASTER_PROMPT.md`

   at the repository root.
3. Save THIS ENTIRE PROMPT into that file VERBATIM, from the first line
   `Repository: https://github.com/asimog/blinkitchen`
   through the final instruction.
4. Do not summarize, shorten or reinterpret the saved prompt.
5. This prompt file is an explicitly authorized additional Markdown file and does
   not violate the later instruction limiting unnecessary documentation.
6. Do NOT stop after saving the prompt.
7. Immediately continue with the repository/documentation analysis and perform
   the complete documentation rewrite described below.

The required execution sequence is therefore:

SAVE THIS PROMPT
        ↓
RECORD CURRENT HEAD
        ↓
READ CURRENT DOCS
        ↓
INSPECT CURRENT IMPLEMENTATION
        ↓
IDENTIFY DOC / CODE MISMATCHES
        ↓
WRITE / REWRITE DOCUMENTATION
        ↓
CROSS-CHECK ALL DOCS
        ↓
RETURN FINAL REPORT

Do not ask for confirmation between these stages.

# BEFORE WRITING THE DOCS

Read the entire current documentation set:

- README.md
- PRODUCT_SCOPE.md
- ARCHITECTURE.md
- DATA_MODEL.md
- SIMULATION.md
- AGENTS.md

Then inspect enough of the actual repository implementation to ensure the
documentation reflects the code rather than assumptions.

At minimum inspect:

- src/catalog/*
- src/data/*
- src/domain/kitchen/*
- src/intelligence/*
- src/simulation/*
- src/insights/*
- src/components/onboarding/*
- src/components/kitchen/*
- src/components/blinkit/*
- src/components/explore/*
- src/app/*

Also inspect tests where they clarify real behavior or invariants.

Do not rely on existing documentation when the code says otherwise.

Do not assume that numbers, schemas, flows or features mentioned in this prompt
remain exactly correct. Verify them against current `main`.

If implementation and documentation disagree:

IMPLEMENTATION = source of truth for CURRENT behavior.

This prompt = source of truth for TARGET PRODUCT DIRECTION.

Clearly distinguish the two.

# THE ACTUAL OBJECTIVE OF BLINKITCHEN

Blinkitchen is a portfolio-grade product-management prototype intended to
demonstrate a credible product opportunity for Blinkit.

The ultimate objective is to show a Blinkit product or strategy leader:

1. a meaningful customer and business problem;
2. a clear product thesis;
3. a thoughtfully scoped MVP;
4. a working prototype of the core product mechanics;
5. disciplined product and technical tradeoffs;
6. an understanding of data, experimentation, metrics and failure modes;
7. how household grocery intelligence could become a real Blinkit product
   capability.

The project should demonstrate the ability to identify, scope, validate and
potentially lead such a product.

However, public-facing repository documentation MUST NOT read like a job
application or repeatedly say:

"this project exists to get hired."

Frame it professionally as:

- a portfolio product case;
- a working prototype;
- a proposed product direction;
- a product/strategy evaluation artifact.

The documentation should feel like it was produced by a product manager who can
also work fluently with engineering and data.

# CORE PRODUCT THESIS

The canonical thesis is:

> Grocery apps usually understand carts and transactions. Blinkitchen tries to
> understand the kitchen itself over time.

Expanded formulation:

> Blinkitchen is a prototype of a longitudinal household grocery intelligence
> layer. It models what a household already has, cooks, consumes, wastes,
> substitutes and repeatedly replenishes, then uses those facts to produce more
> relevant meal recommendations, baskets, substitutions and replenishment
> suggestions over time.

The project is NOT primarily:

- a recipe app;
- a pantry tracker;
- a meal-planning calendar;
- a grocery marketplace clone;
- a Blinkit scraper;
- an AI/LLM demonstration;
- an engineering infrastructure showcase.

Recipes and commerce data are supporting layers.

The core product is:

HOUSEHOLD STATE
        +
LONGITUDINAL BEHAVIOUR
        ↓
HOUSEHOLD GROCERY INTELLIGENCE

# THE PRODUCT QUESTION

Blinkitchen asks:

> What becomes possible if a grocery app understands the household's actual
> kitchen, not merely its previous transactions?

Traditional grocery context is approximately:

search
    ↓
product impression
    ↓
cart
    ↓
transaction
    ↓
reorder

Blinkitchen explores:

household
    ↓
what is usually kept
what is currently available
what gets cooked
what gets consumed
what gets wasted
what substitutions are accepted
what repeatedly runs low
what cuisines and routines emerge
    ↓
Kitchen State
    ↓
household intelligence
    ↓
more useful meals
more useful baskets
ingredient reuse
better substitutions
replenishment
    ↓
new household facts
    ↓
better future intelligence

# CANONICAL PRODUCT LOOP

The conceptual product loop is:

Onboarding
    ↓
Kitchen State
    ↓
Understand current pantry + household facts
    ↓
Recommend meals
    ↓
Construct pantry-aware weekly plan
    ↓
Build missing-only basket
    ↓
Reuse ingredients across meals
    ↓
Offer substitutions where appropriate
    ↓
Observe purchases / cooking / consumption / waste
    ↓
Learn household behaviour
    ↓
Generate replenishment signals
    ↓
Next week's recommendations improve

The customer should eventually be able to answer:

- What can we cook from what is already at home?
- What should be used soon?
- What meals fit our preferences, time and budget?
- What ingredients can be reused across multiple meals?
- What do we actually need to buy?
- Which substitutions make sense for this household?
- What repeatedly runs low?
- What has Blinkitchen learned about us over time?

The Blinkit/product-strategy questions are different:

- Which ingredients repeatedly become missing?
- Which ingredients create useful cross-meal reuse?
- Which substitution patterns succeed or fail?
- Which products display recurring replenishment behaviour?
- What household-specific cuisine/category patterns emerge?
- How might household state improve recipe-to-basket conversion?
- How might it improve recommendation relevance?
- How might it improve replenishment timing?
- How might it support better substitutions?
- How might it support pack-size selection?
- How might it improve cross-sell or merchandising?
- How might relevance affect trust, frequency and retention?

Never present simulated answers to these questions as actual Blinkit customer
evidence.

# CRITICAL PRODUCT PRINCIPLE

Blinkitchen should progressively earn its household model.

Do not require the customer to explain everything about their kitchen upfront.

The system should distinguish:

NEEDED NOW
→ ask during onboarding

CAN BE LEARNED
→ infer from later household behavior

CAN BE CORRECTED LATER
→ do not block onboarding

This principle must shape both the documentation and the planned UI direction.

# CRITICAL UI/UX PROBLEM

The current UI has become too wordy, too explanatory and too dense.

The documentation must acknowledge this as a current product-design problem.

The engine contains useful intelligence, but too much of that intelligence is
currently presented with similar visual importance.

The interface risks making the customer interpret the engine instead of letting
the engine simplify the customer's decision.

The target principle is:

> Show the intelligence. Do not narrate every piece of it.

And:

> One screen, one primary question, one obvious next action.

And:

> Complexity belongs in the engine, not by default in the interface.

# UI/UX NORTH STAR

Blinkitchen should feel:

- fast;
- obvious;
- lightweight;
- visual;
- consumer-facing;
- progressively revealing;
- easy to demo;
- easy to understand without reading documentation.

It should NOT feel like:

- an analytics dashboard;
- a model-debugging interface;
- an engineering console;
- a research application;
- a long questionnaire;
- a configuration wizard;
- a wall of cards;
- a wall of explanatory paragraphs.

The underlying intelligence can remain rich.

The default customer interface should remain simple.

Use progressive disclosure:

DEFAULT
show the decision

EXPAND
show why

DEEP DETAIL
show scoring / mechanics if deliberately requested

# THE SIMPLE PRODUCT FORMULA

The target interaction philosophy is:

SIMPLE INPUT
      ↓
RICH HOUSEHOLD STATE
      ↓
RICH INTELLIGENCE
      ↓
SIMPLE DECISIONS

Not:

COMPLEX INPUT
      ↓
COMPLEX DASHBOARD
      ↓
USER INTERPRETS THE ENGINE

The intelligence should make grocery planning easier.

As the system becomes smarter, the interface should feel simpler.

# THREE-STEP ONBOARDING IS THE CANONICAL TARGET

The current onboarding is longer than the target product should require.

The future onboarding MUST be reduced to THREE SHORT PRIMARY STEPS.

This supersedes any older five-step onboarding proposal in existing docs or
earlier specifications.

Remove future documentation describing onboarding as five primary steps.

The design goal is approximately one minute or less for a normal user.

There should be:

- minimal typing;
- almost no explanatory paragraphs;
- no requirement to understand Blinkitchen's internal model;
- no giant ingredient selector;
- no requirement to perfectly inventory the kitchen;
- no abstract percentage calibration;
- no separate mandatory review screen.

The guiding principle is:

> Get enough signal to produce a useful Week 1. Learn the rest later.

# ONBOARDING STEP 1: YOUR HOUSEHOLD

Capture only information necessary to avoid obviously poor recommendations.

Target concepts:

- household size;
- diet;
- location;
- approximate weekly grocery budget.

Do not introduce unnecessary friction.

If the current domain requires a `displayName`, the future interface may:

- prefill a sensible default such as "My Kitchen";
- generate one;
- or make naming optional from the customer's perspective.

Do not require the customer to make product-model decisions.

Conceptual screen:

YOUR HOUSEHOLD

2 people

Vegetarian

South Delhi

₹1,500/week

[Continue]

No explanatory essay.

# ONBOARDING STEP 2: HOW YOU EAT

The current internal model may contain concepts such as:

- conveniencePreference;
- priceSensitivity;
- explorationPreference;
- planningPreference.

These may remain useful internal profile fields.

The future customer interface should not require users to manipulate four
abstract 0..1 sliders if natural choices can provide equivalent input.

Use simple language.

Possible structure:

CUISINES YOU LIKE

Punjabi
North Indian
South Indian
Indo-Chinese
etc.

WHAT MATTERS MOST?

[ Use what I have ]
[ Save money ]
[ Cook quickly ]
[ Try new dishes ]

Allow only a small number of priority selections.

Capture cooking frequency simply:

[ Most days ]
[ A few days a week ]
[ Occasionally ]

The eventual implementation may translate these lightweight choices into the
existing profile model.

For example:

Use what I have
→ higher planning preference

Save money
→ higher price sensitivity

Cook quickly
→ higher convenience preference

Try new dishes
→ higher exploration preference

This is planned UX mapping unless already implemented.

Do not document it as current behavior unless verified.

Conceptual screen:

HOW YOU EAT

Punjabi · North Indian

What matters most?
[ Use what I have ]
[ Cook quickly ]

Usually cook:
[ Most days ]

[Continue]

# ONBOARDING STEP 3: YOUR KITCHEN

Do not turn onboarding into inventory management.

Do not ask the user to manually work through hundreds of ingredients.

Show a small number of familiar, high-value quick selections.

Possible structure:

PANTRY BASICS

Atta
Rice
Dal
Oil
Salt
Common spices

FRESH BASICS

Onion
Tomato
Potato
Ginger
Garlic
Green chilli

REGULARLY BOUGHT

Milk
Curd
Bread
Eggs
Paneer

The user taps what is around.

Provide:

- common quick selections;
- optional search/add;
- a clear option to start mostly empty.

Do not require perfect inventory precision.

Future quantity capture may use lightweight concepts such as:

Low
Some
Plenty

if that proves useful.

Such controls can be translated at the UI boundary into canonical quantities
required by the domain.

Do not claim that approximation mapping exists unless implemented.

The principle is:

> Approximate useful state is better than onboarding abandonment caused by
> inventory precision.

End with one obvious action:

[START WEEK 1]

Do not require a fourth review step unless later usability evidence demonstrates
that it is necessary.

# THREE-STEP ONBOARDING SUMMARY

The canonical future onboarding is:

1. YOUR HOUSEHOLD
   people · diet · location · budget

2. HOW YOU EAT
   cuisines · cooking frequency · 1–2 priorities

3. YOUR KITCHEN
   tap common ingredients · optional search/add

Then:

START WEEK 1

This is the onboarding direction that should appear consistently across all docs.

# WHAT ONBOARDING SHOULD NOT ASK UPFRONT

Needed immediately:

- diet;
- household size;
- broad cooking behavior;
- enough kitchen context to produce useful Week 1 recommendations.

Learn later:

- actual cuisine affinity;
- true household staples;
- replenishment cadence;
- substitution preferences;
- repeated meals;
- waste patterns;
- real convenience behavior;
- actual price sensitivity behavior.

Correct later:

- pantry quantities;
- forgotten ingredients;
- changing budget;
- changing preferences;
- unusual weekly circumstances.

The system should progressively improve rather than demanding complete household
knowledge at signup.

# CORE ARCHITECTURAL PRINCIPLE

Preserve the existing architectural rule:

> Persist facts. Derive intelligence.

There is one authoritative household model:

`KitchenState`

It contains factual/stated household state such as:

- profile;
- current pantry;
- grocery facts;
- consumption facts;
- meal facts;
- explicit week-scoped choices.

Derived intelligence must NOT become a second persisted authority.

Recommendations, scores, baskets, pantry coverage, ingredient chains, learned
affinities, substitutions, replenishment suggestions, explanations and
Blinkit-level insights remain projections computed from:

KitchenState + Catalog
        ↓
WeekIntelligence

and:

KitchenState snapshots + Catalog
        ↓
BlinkitInsights

Do not propose replacing this architecture.

# DO NOT INTRODUCE UNNECESSARY ARCHITECTURE

Do not propose:

- persisted recommendation state;
- persisted learned-profile state;
- microservices;
- event buses;
- agent frameworks;
- LLM orchestration;
- vector databases;
- backend services;
- authentication;
- database infrastructure;
- queues;
- generic repository layers;
- distributed services.

The existing architecture is intentionally small.

Keep it small.

# RICH ENGINE DOES NOT REQUIRE A RICH SCREEN

Document this distinction clearly:

ENGINE COMPLEXITY
≠
INTERFACE COMPLEXITY

The intelligence engine may calculate:

- meal ranking;
- coverage;
- ingredient chains;
- use-soon opportunities;
- basket requirements;
- substitutions;
- replenishment;
- household learning;
- explanations;
- aggregate signals.

The UI does NOT have to display every result simultaneously.

The UI should selectively compose the projections relevant to the user's current
decision.

This is not a new architectural layer.

It is presentation hierarchy.

# CANONICAL ARCHITECTURE TO DOCUMENT

The conceptual architecture should be:

OFFLINE KNOWLEDGE BUILD
    raw/open/licensed recipe sources
    ingredient aliases
    unit normalization
    provenance
    validation
    deduplication
              ↓
READ-ONLY CATALOG
    canonical ingredients
    recipes
    substitutions
    simulated products / packages
    locations
              ↓
HOUSEHOLD TRUTH
    KitchenState
    profile
    pantry
    groceries received
    ingredients used
    ingredients wasted
    meals cooked
    explicit decisions
              ↓
PURE INTELLIGENCE
    learning
    meal fit
    weekly planning
    pantry coverage
    use-soon
    ingredient chaining
    substitutions
    basket
    replenishment
    explanations
              ↓
      ┌──────────────┬──────────────┐
      ↓              ↓
 CUSTOMER VIEW    BLINKIT / PM LENS

The OFFLINE KNOWLEDGE BUILD layer is a planned/future data pipeline.

Do not imply it currently exists unless code proves otherwise.

# CURRENT REPOSITORY STATE TO VERIFY

Verify the actual current values before documenting them.

At the time this task was prepared, the repository recently contained
approximately:

- 43 canonical ingredients;
- 14 recipes;
- 46 simulated product templates;
- 2 simulated Delhi locations;
- approximately 92 expanded product/location SKU rows;
- 8 explicit substitution relationships;
- 4 simulated household archetypes;
- an 8-week deterministic journey.

Do NOT blindly copy these numbers.

Recount from current `main`.

Correct stale counts anywhere in:

- README;
- PRODUCT_SCOPE;
- DATA_MODEL;
- SIMULATION;
- or other docs.

The four simulated household archetypes should remain conceptually:

- Pantry Planner
- Cuisine Explorer
- Value Optimizer
- Convenience Household

They are NOT four recommendation algorithms.

They are different inputs passed through the same engine.

# CURRENT IMPLEMENTATION VS TARGET DIRECTION

One of the most important documentation improvements is a strict distinction
between:

CURRENTLY IMPLEMENTED

and:

PLANNED / TARGET DIRECTION

Never describe planned behavior as current.

Examples of CURRENT capabilities may include, subject to verification:

- one KitchenState authority;
- deterministic meal ranking;
- pantry-aware basket;
- explicit substitutions;
- use-soon logic;
- deterministic learning projection;
- replenishment heuristic;
- ingredient-chain detection;
- simulated products and prices;
- deterministic household simulations;
- eight-week journeys;
- customer projection;
- Blinkit projection.

Examples of TARGET capabilities:

- hundreds of canonical ingredients;
- hundreds or thousands of recipes;
- alias normalization;
- offline recipe ingestion;
- richer provenance;
- household staple derivation;
- stronger replenishment cadence;
- true plan-level optimization;
- larger simulated commerce catalog;
- simpler three-step onboarding;
- shorter customer UI;
- Week 1 → Week 8 comparison;
- clearer product experiment/metrics framing.

# IMPORTANT CURRENT INTELLIGENCE LIMITATION

Inspect:

`src/intelligence/meals.ts`

carefully.

The current engine ranks recipes individually.

The existing `ingredientReuse` factor is not necessarily a true whole-week
ingredient-reuse optimization score.

It largely reflects reuse/chain potential based on ingredient occurrence across
the recipe corpus.

Then the current plan construction takes high-ranked meals, after which ingredient
chains can be detected.

Therefore do NOT overclaim that Blinkitchen currently solves a global weekly
optimization problem.

If existing homepage/docs contain language such as:

"Ingredient chaining shapes which dishes rank highest"

verify whether this is technically accurate enough.

Current implementation should be described honestly, for example:

- meals receive a reuse or chain-potential signal;
- the resulting weekly plan can be inspected for shared ingredients;
- actual plan-level optimization across marginal cost, pantry use and shared
  ingredients is a planned enhancement.

# TARGET PLAN-LEVEL INTELLIGENCE

Future target:

candidate meals
      ↓
evaluate candidate against current partial week
      ↓
household fit
pantry coverage
incremental basket cost
actual cross-meal reuse
use-soon rescue
budget fit
convenience
variety
recent repetition
      ↓
deterministic plan utility
      ↓
choose next meal
      ↓
weekly plan

Do not introduce unnecessary optimization frameworks.

A deterministic, explainable greedy planner may be sufficient.

The product goal is not mathematical sophistication.

The product goal is:

- useful;
- explainable;
- deterministic;
- testable;
- credible.

# TERMINOLOGY FOR REUSE

If appropriate based on current code, distinguish:

MEAL-LEVEL:

chain potential / reuse potential

from:

PLAN-LEVEL:

actual cross-meal reuse

Do not call something whole-week optimization when it is not.

# SIMULATION: CRITICAL PRODUCT-MANAGEMENT DISTINCTION

The simulation is a deterministic behavioral sandbox.

It demonstrates product mechanics under encoded assumptions.

It is NOT evidence about actual users.

Make this impossible to misunderstand.

For example, if current simulation logic makes price-sensitive profiles more
likely to accept substitutions, then:

"Value Optimizer accepts more substitutions"

is an expected consequence of the simulation design.

It does NOT prove:

"Real price-sensitive Blinkit customers accept more substitutions."

The documentation should explicitly show:

Simulation assumption
        ↓
Expected prototype behavior
        ↓
Product hypothesis
        ↓
Real-world experiment required

# SIMULATION ASSUMPTION TABLE

Add a concise assumption table to SIMULATION.md.

Suggested structure:

| Assumption | Prototype behavior | Real-world question |
| --- | --- | --- |
| Higher price sensitivity | substitution threshold changes | Does real substitution acceptance vary with price sensitivity? |
| Higher planning preference | pantry/use-soon signals matter more | Does pantry-conscious planning improve engagement? |
| Higher exploration preference | discovery meals surface more often | Does observed exploration match stated preference? |

Verify the real simulation logic before describing each assumption.

Do not invent mechanisms that are not in code.

# BUSINESS / PM STORY

The product problem:

Quick-commerce systems can have rich transaction data while still having weak
knowledge of the household's current kitchen state.

Purchase history does not necessarily reveal:

- what remains at home;
- what was actually consumed;
- what was wasted;
- what was used in meals;
- which substitutions worked;
- what is running low now;
- what a household regularly keeps.

Product hypothesis:

> A lightweight household model could improve grocery relevance by combining
> pantry state, cooking behavior and longitudinal consumption signals.

Potential customer value:

- fewer unnecessary purchases;
- less meal-planning effort;
- better use of food already owned;
- lower waste;
- more relevant meals;
- better substitutions;
- smarter replenishment;
- smaller but more useful baskets.

Potential Blinkit value:

- more relevant recommendations;
- stronger recipe-to-basket usefulness;
- context-aware cross-sell;
- better replenishment timing;
- better substitution ranking;
- household-aware merchandising;
- richer recurring-demand understanding;
- potentially stronger retention and trust.

Do NOT state these outcomes as proven.

They are product hypotheses.

# IMPORTANT BUSINESS TENSION

Do not make the naive claim:

"pantry awareness automatically increases basket size."

Blinkitchen may intentionally remove unnecessary purchases.

Example:

Conventional recipe requirement:
₹900

Already in kitchen:
₹250

Kitchen-aware purchase:
₹650

Immediate basket value could be lower.

Therefore the actual business question is broader:

Does improved relevance and trust create enough benefit through:

- higher conversion;
- greater order frequency;
- higher retention;
- increased category penetration;
- more useful attach;
- repeat usage;
- improved long-term customer value;

to offset removal of unnecessary purchases?

This tension should appear clearly in PRODUCT_CASE.md.

# ONBOARDING IS ITSELF A PRODUCT HYPOTHESIS

Household intelligence only creates value if obtaining household context is cheap
enough.

More context may improve recommendation quality.

But asking for too much context destroys adoption.

Therefore:

> Blinkitchen must progressively earn its household model rather than demand it
> upfront.

Document onboarding friction as a primary risk.

Proposed validation metrics should include:

- onboarding completion;
- onboarding abandonment;
- time to Week 1;
- correction burden;
- later kitchen edits.

# EXPERIMENTATION STORY

Add a clear future validation framework.

Do not invent results.

Possible experiment:

POPULATION

Eligible grocery customers willing to establish lightweight household context.

CONTROL

Existing/conventional recipe or product recommendation experience.

TREATMENT

Kitchen-state-aware recommendation experience.

Possible primary metrics:

- onboarding completion;
- meal recommendation acceptance;
- plan-to-basket conversion;
- recommended basket add rate;
- replenishment acceptance;
- substitution acceptance;
- repeated household-intelligence usage;
- 4-week return / retention.

Customer-value diagnostics:

- pantry coverage;
- use-soon rescue;
- redundant purchase avoidance;
- pantry correction frequency;
- recommendation dismissal rate.

Business metrics:

- order conversion;
- order frequency;
- retention;
- category penetration;
- useful incremental attach;
- contribution margin where relevant.

Guardrails:

- onboarding abandonment;
- excessive correction burden;
- recommendation irrelevance;
- excessive immediate basket reduction;
- customer distrust;
- stale inferred kitchen state;
- latency/performance.

Present all metrics as PROPOSED measurements.

Do not pretend the prototype has collected them.

# DATA STRATEGY

Create:

`DATA_STRATEGY.md`

This document describes the target data foundation without implementing it.

Potential prototype target ranges:

- 300–500 canonical ingredients;
- initially 300–500 validated recipes;
- later 800–1,500 high-quality recipes if useful;
- 1,000–2,000 simulated product/SKU variants;
- 50–150 explicit substitution relationships;
- Delhi/NCR as the initial product context.

These are directional ranges, not contractual requirements.

Prioritize data quality over raw volume.

State clearly:

> 1,000 well-normalized recipes are more useful to Blinkitchen than 50,000 dirty
> recipes.

# CANONICAL INGREDIENTS

Explain alias normalization.

Example:

dahi
curd
yogurt
yoghurt
        ↓
canonical yogurt ingredient

Example:

dhania
coriander
coriander leaves
cilantro
        ↓
canonical coriander ingredient

The canonical ingredient graph is more important to household intelligence than
raw recipe count.

# TARGET RECIPE INGESTION PIPELINE

Document the future pipeline:

raw source
    ↓
RawRecipe
    ↓
ingredient parsing
    ↓
alias resolution
    ↓
unit normalization
    ↓
schema validation
    ↓
deduplication
    ↓
CanonicalRecipe
    ↓
curated runtime catalog

Keep ingestion outside runtime Blinkitchen.

The application should continue consuming validated catalog data through the
existing catalog seam.

# DATA SOURCE PRINCIPLES

Do not provide instructions to violate website terms or indiscriminately scrape
protected content.

Prefer:

- open datasets;
- appropriately licensed APIs/data;
- public factual/reference data;
- independently normalized factual recipe structure;
- explicit provenance.

Keep the data strategy separate from runtime product architecture.

# INGREDIENT MODEL

Do not collapse ingredients into:

staple | perishable | daily

These concepts overlap.

Document distinct dimensions.

Catalog characteristics may include:

- category;
- storage type;
- shelf life;
- generic staple flag;
- units;
- dietary attributes;
- aliases.

Household-derived characteristics may include:

- frequently used;
- frequently purchased;
- household staple;
- repeatedly wasted;
- likely replenishment item.

Example:

Tomato can simultaneously be:

- vegetable;
- perishable;
- generic staple;
- frequently used by Household A;
- rarely used by Household B.

"Daily" should be derived from household behavior, not globally hard-coded.

# HOUSEHOLD STAPLES

Distinguish:

GENERIC STAPLE
catalog knowledge

from:

HOUSEHOLD STAPLE
derived from that household's history

This distinction should remain central.

A future household-staple projection may consider:

- usage frequency;
- purchase frequency;
- replenishment frequency;
- waste;
- consistency over time.

Do not add it to current state documentation unless it actually exists.

# POTENTIAL `usualIngredientIds`

A future stated fact such as:

`usualIngredientIds`

may represent:

"ingredients this household says it normally keeps."

It must remain distinct from:

`pantry[]`

which represents current physical stock.

Do not claim this field currently exists unless verified.

# DIET MODEL

Inspect the real implementation.

If KitchenProfile supports:

- vegetarian;
- vegan;
- eggetarian;
- non_vegetarian;
- flexible;

but onboarding/catalog data currently supports a narrower subset, document the
mismatch honestly.

Do not imply full end-to-end dietary support unless it exists.

Target direction:

coherent end-to-end support across:

profile
→ ingredients
→ recipes
→ ranking
→ substitutions
→ onboarding

# OPTIONAL RECIPE INGREDIENTS

Inspect current behavior.

If `optional: true` recipe ingredients are still treated as required by basket
logic, document this as a current limitation.

Target behavior:

required ingredient
→ affects coverage and required basket

optional ingredient
→ does not block recipe
→ does not automatically become required purchase

Do not describe the target as implemented until code supports it.

# TARGET RECIPE MODEL

Document conceptually:

Recipe

identity
- id
- name
- aliases

classification
- cuisine
- region
- meal slots
- dietary attributes
- tags

planning
- servings
- preparation time
- cooking time
- complexity

ingredients
- canonical ingredient id
- quantity
- unit
- optional
- preparation note where useful

nutrition
- optional enrichment

provenance
- source
- source URL
- ingestion provenance

Recipes reference ingredients.

Recipes do NOT reference SKUs.

# PRODUCT / SKU MODEL

Preserve:

Recipe
    ↓
Canonical Ingredient
    ↓
Product candidates / SKUs

A recipe should never directly reference a product.

Example:

Recipe needs:
350 g paneer

Available products:
200 g pack
500 g pack

The commerce layer decides how requirements map to packages.

Future whole-week package reasoning may consider:

Meal A:
200 g

Meal B:
250 g

Weekly requirement:
450 g

Available:
200 g pack
500 g pack

Potential better purchase:
500 g

Do not claim this specific optimization exists unless verified.

# HOUSEHOLD LEARNING

Preserve the existing philosophy:

There is no persisted magical "AI profile."

Learning is derived from accumulated household facts.

Current learning may include, subject to verification:

- cuisine affinity;
- substitution affinity;
- price sensitivity evidence;
- convenience evidence;
- exploration tendency;
- frequent ingredients;
- wasted ingredients;
- repeated recipes.

Potential future additions:

- household staples;
- usage frequency;
- purchase frequency;
- replenishment cadence.

Keep derived concepts out of KitchenState unless there is a clear factual reason
to persist them.

# WEEK 1 → WEEK 8 IS THE CORE DEMO

The product thesis is longitudinal.

Week 1 mostly knows:

- stated preferences;
- initial pantry;
- household profile.

Later weeks increasingly include:

- completed meals;
- consumption;
- purchases;
- waste;
- accepted/rejected substitutions;
- recurring shortages;
- observed cuisine behavior.

The product value is not:

"Week 1 gives a good recipe."

The stronger proposition is:

> The grocery experience becomes increasingly household-specific as facts
> accumulate.

# WEEK 1 → WEEK 8 UI TARGET

The reviewer should not have to interpret eight dense screens manually.

Document a future compact comparison surface.

Conceptual structure:

WHAT CHANGED?

WEEK 1

Knows:
- stated diet
- selected cuisines
- starting kitchen

WEEK 8

Learned:
- recurring ingredients
- cuisine behavior
- substitution preferences
- waste patterns
- replenishment signals

Do not invent actual outcome text unless verified from current simulation.

The important product requirement is that longitudinal change becomes immediately
visible.

# CUSTOMER UI RULE 1: ONE PRIMARY JOB PER SCREEN

HOME
Understand the thesis.

ONBOARDING
Get started quickly.

WEEK
Decide what to cook / buy.

LEARNING
Understand what changed.

BLINKIT LENS
Understand the product opportunity.

Do not make every intelligence result compete for attention.

# CUSTOMER UI RULE 2: INSIGHT FIRST, MECHANICS SECOND

Do not default to showing something like:

Pantry fit: 76%
Cuisine fit: 83%
Reuse: 64%
Budget fit: 91%
Convenience: 52%

Prefer something customer-oriented:

PANEER BHURJI

82% already at home
₹74 more

Uses tomatoes already in your kitchen
20 min

[Add]

[Why this?]

Detailed scoring can remain behind:

Why this?
How was this chosen?

Explainability should remain available without turning the default screen into a
model diagnostics view.

# CUSTOMER UI RULE 3: ACTION BEFORE ANALYSIS

The customer primarily needs to know:

- Cook this.
- Use this soon.
- Buy these things.
- Swap this.
- Restock this.

The detailed reason is secondary.

# CUSTOMER UI RULE 4: PROGRESSIVE DISCLOSURE

Default:
simple decision

Expand:
short explanation

Advanced detail:
technical scoring / mechanics

Do not delete intelligence from the engine merely because the UI is simplified.

# WEEK VIEW CLEANUP

Inspect current `WeekView` and related panels.

The current week can expose many things such as:

- headline metrics;
- pantry snapshot;
- meal planner;
- ranked meals;
- scoring details;
- ingredient chains;
- feedback;
- basket;
- substitutions;
- replenishment;
- learning;
- week checklist;
- explanatory narrative.

The issue is not that these concepts are individually useless.

The issue is hierarchy.

Document the target weekly experience approximately as:

WEEK 4

YOUR KITCHEN THIS WEEK

"Use the paneer and tomatoes first.
You already have 68% of this week's ingredients."

        ↓

THIS WEEK'S PLAN

3–5 clear meal choices

        ↓

YOUR BASKET

6 things to buy
₹620
₹280 already at home

        ↓

SMART EXTRAS

Use soon
Swap
Restock

        ↓

WHAT CHANGED

1–2 learning insights

Detailed technical views should remain available through drill-down rather than
occupying equal default prominence.

Do not prescribe the final visual layout rigidly.

Document the hierarchy.

# MEAL CARD CLEANUP

Target default meal card should prioritize:

- meal name;
- usefulness/fit;
- how much is already available;
- incremental cost;
- one or two reasons;
- primary action.

Conceptual example:

PANEER BHURJI

82% already home
₹74 more

Uses tomatoes already in your kitchen
20 min

[Add]

Why this?

The full internal score should not dominate the card.

# BASKET CLEANUP

The basket should communicate:

YOU NEED 6 THINGS

₹620 to buy

₹280 already at home

Then show basket items.

On customer surfaces prefer:

"Already at home"

over:

"Demand avoided by pantry."

The analytical term can remain appropriate in the Blinkit Lens.

# LEARNING UI CLEANUP

Prefer a few concrete statements.

Example:

BLINKITCHEN LEARNED

You cook Punjabi more often than you initially said.

You've rejected tofu for paneer twice.

Curd is becoming a regular.

Avoid requiring users to interpret multiple affinity percentages by default.

Detailed signal values may remain expandable.

# REPLENISHMENT COPY

Prefer customer language.

Avoid:

"Derived from consumption history, not guesswork."

Prefer:

"You use this often and you're running low."

The engine remains deterministic and explainable without talking like an
engineering system.

# SUBSTITUTION COPY

Avoid:

"Substitution affinity increased."

Prefer:

"You've accepted this swap before."

# INGREDIENT CHAINING COPY

Avoid:

"Ingredient chaining opportunity."

Prefer:

"Buy once, use in 3 meals."

# HOME PAGE CLEANUP

The home page should answer immediately:

WHAT IS BLINKITCHEN?

Target hierarchy:

Headline:

Your grocery app remembers the kitchen, not just the cart.

One short supporting sentence.

Primary CTA:

SEE THE 8-WEEK DEMO

Secondary CTA:

BUILD YOUR KITCHEN

Optional tertiary path:

BLINKIT LENS

For this portfolio/product-review objective, the fastest path should take the
reviewer to the strongest demonstration.

Therefore the simulated 8-week journey should be documented as the preferred
primary reviewer path.

The reviewer should not need to complete onboarding before understanding the
product.

# BLINKIT LENS REFRAMING

The Blinkit Lens should remain a product-strategy projection, not become a huge
analytics dashboard.

Target hierarchy:

1. THE OPPORTUNITY

one short statement

2. WHAT THE PROTOTYPE DEMONSTRATES

3–4 strongest mechanics/signals

3. WHAT THIS COULD ENABLE

product/business hypotheses

4. HOW I WOULD TEST IT

experiment + key metrics

Detailed cohort tables and secondary metrics can remain lower on the page or
behind expansion.

# THREE DISTINCT LAYERS IN BLINKIT LENS

A. WHAT THE PROTOTYPE DEMONSTRATES

Examples:

- pantry state changes basket composition;
- household history changes recommendation inputs;
- explicit substitution decisions affect future swap ranking;
- repeated consumption can create replenishment signals;
- different household inputs produce different journeys.

B. WHAT THIS COULD MEAN FOR BLINKIT

Hypotheses such as:

- household-aware recommendations may improve relevance;
- pantry-aware recipes may improve recipe-to-basket usefulness;
- replenishment signals may improve timing;
- household history may improve substitution ranking;
- ingredient reuse may improve cross-sell usefulness;
- whole-week planning may improve pack-size recommendations.

C. WHAT MUST BE TESTED

Real customer validation.

Do not conflate these three layers.

# SIMULATION LABELING WITHOUT CLUTTER

The prototype must remain honest that:

- households;
- products;
- prices;
- demand;
- aggregate outcomes;

are simulated.

But honesty does not require placing the word "simulated" beside every number.

Target UI principle:

Use clear page/section-level labeling such as:

SIMULATED DEMO

Then repeat where omission could reasonably mislead.

Reduce visual repetition while preserving complete honesty.

Document this as a planned UI cleanup.

# PORTFOLIO / PM REVIEWER JOURNEY

A Blinkit product/strategy reviewer should understand the product in only a few
minutes.

Target path:

HOME

"What if the grocery app understood the kitchen?"

        ↓

SEE 8-WEEK DEMO

Week 1

        ↓

JUMP / COMPARE

Week 8
What changed?

        ↓

BLINKIT LENS

What might this enable?

        ↓

PRODUCT CASE

How would this be validated?

The reviewer should not need to:

- complete a long onboarding;
- inspect all eight weeks;
- expand every panel;
- understand scoring formulas;
- read dense prose.

# REVISED PRODUCT SUCCESS TEST

A Blinkit product/strategy reviewer should be able to:

1. understand the thesis within seconds;
2. open the simulated demo quickly;
3. understand what Week 1 knows;
4. jump to later weeks;
5. see what was learned;
6. understand how pantry state changes the basket;
7. see at least one clear example of ingredient reuse;
8. understand substitution memory;
9. understand replenishment;
10. open the Blinkit Lens;
11. understand what the prototype demonstrates;
12. understand what remains hypothetical;
13. understand the proposed experiment.

All without reading large amounts of text.

For a customer building a household:

1. onboarding has only three short primary steps;
2. onboarding can be completed quickly;
3. perfect inventory entry is not required;
4. Week 1 becomes useful immediately;
5. missing context can be learned later;
6. corrections can be made later without restarting onboarding.

# DOCUMENTATION FILES TO MODIFY / CREATE

The documentation system should consist of:

README.md
PRODUCT_SCOPE.md
PRODUCT_CASE.md
ARCHITECTURE.md
DATA_MODEL.md
DATA_STRATEGY.md
SIMULATION.md
AGENTS.md
DOCUMENTATION_MASTER_PROMPT.md

`DOCUMENTATION_MASTER_PROMPT.md` is the verbatim saved copy of this task prompt.

Do not link to the prompt file from the customer/product documentation unless
there is a compelling reason.

It is an execution/audit artifact.

# 1. README.md

Keep README concise.

It should explain:

- what Blinkitchen is;
- the one-line thesis;
- the fact → intelligence architecture;
- the customer experience;
- the Blinkit Lens;
- the fastest demo path;
- how to run;
- how to verify;
- links to documentation.

Add links to:

- PRODUCT_CASE.md
- DATA_STRATEGY.md

Do not turn README into the full PM case.

The demo path should receive strong prominence.

# 2. PRODUCT_SCOPE.md

Rewrite/refine to establish:

- product problem;
- product thesis;
- target audience;
- customer value;
- potential Blinkit value;
- longitudinal product loop;
- current MVP;
- current limitations;
- planned direction;
- explicit non-goals;
- simulation honesty;
- success criteria.

Add an "Experience principles" section covering:

- three-step onboarding;
- ask less upfront;
- learn progressively;
- one primary job per screen;
- insight before mechanics;
- progressive disclosure;
- reviewer should reach the core demonstration quickly;
- customer UI should remain simpler than the engine.

Remove/replace any five-step future onboarding direction.

# 3. PRODUCT_CASE.md

CREATE this file.

This is the PM case.

Include:

- Opportunity
- User problem
- Product hypothesis
- Why transaction history is not kitchen state
- Target user / initial market
- MVP
- Customer value
- Potential Blinkit value
- Business tension around smaller but more relevant baskets
- Key assumptions
- Onboarding friction
- Why progressive learning matters
- Experiment proposal
- Primary metrics
- Customer-value diagnostics
- Business metrics
- Guardrails
- Risks
- Mitigation
- What the prototype demonstrates
- What it does not prove
- What a successful pilot could lead to

It should read like a strong PM product case.

Do not make it sound like a pitch deck full of hype.

# 4. ARCHITECTURE.md

Preserve the current architecture.

Do NOT redesign it.

Clarify:

- one KitchenState authority;
- Catalog is read-only;
- pure derived projections;
- dependency direction;
- small effect boundary;
- simulation uses the same domain;
- customer and Blinkit views are projections;
- planned offline ingestion boundary;
- no current need for backend/LLM/vector DB/etc.;
- rich engine does not imply complex interface;
- UI selectively presents derived intelligence.

Correct implementation mismatches.

# 5. DATA_MODEL.md

Bring it into exact alignment with current code.

Verify:

- KitchenState;
- KitchenProfile;
- PantryItem;
- GroceryFact;
- ConsumptionFact;
- MealFact;
- WeeklyChoices;
- meal slots;
- catalog types;
- ingredient fields;
- recipe fields;
- substitutions;
- products;
- locations;
- units;
- WeekIntelligence;
- Learning;
- scoring factors;
- localStorage key/version;
- actual seed counts.

Then add a clearly marked:

FUTURE DATA DIRECTION

covering:

- ingredient aliases;
- richer provenance;
- richer recipe fields;
- household staple projection;
- potential usualIngredientIds;
- optional ingredient semantics;
- target dataset scale;
- lightweight UI-to-profile mapping;
- lightweight pantry approximation as a future UI boundary concern.

Do not modify code types.

# 6. DATA_STRATEGY.md

CREATE this file.

Include:

- purpose;
- why canonical ingredients matter;
- target dataset ranges;
- alias normalization;
- recipe ingestion;
- unit normalization;
- validation;
- deduplication;
- provenance;
- SKU mapping;
- substitution data;
- nutrition as optional enrichment;
- Delhi/NCR initial focus;
- quality-over-volume principle;
- current catalog vs target catalog;
- offline ingestion boundary;
- why the runtime architecture should remain unchanged.

Do not provide instructions for prohibited scraping.

# 7. SIMULATION.md

Preserve the deterministic simulation architecture.

Improve:

- purpose;
- four archetypes;
- weekly loop;
- determinism;
- Week 1 → Week 8 arc;
- simulation assumptions;
- assumption → expected behavior → empirical question;
- what simulation demonstrates;
- what it cannot validate.

Add the assumption table.

Also document that the future UX should enable a compact Week 1 → Week 8
comparison so reviewers do not need to inspect every week manually.

# 8. AGENTS.md

Keep AGENTS.md SHORT.

Do not make it another product specification.

Add/retain concise rules:

- Blinkitchen is a PM prototype of household grocery intelligence.
- Optimize for demonstrating household intelligence.
- Preserve one authoritative KitchenState.
- Persist facts, derive intelligence.
- Catalog is read-only.
- Derived intelligence remains recomputable.
- Recipes reference ingredients, never SKUs.
- Products reference ingredients.
- Simulation must use production domain/intelligence paths.
- Never present simulated outputs as empirical customer evidence.
- Prefer deterministic logic where the answer is calculable.
- Do not introduce infrastructure without demonstrated product need.
- Keep current vs planned behavior explicit.
- Default to less copy.
- One primary action per screen.
- Do not expose every intelligence field merely because it exists.
- Prefer progressive disclosure.
- Customer language should describe outcomes, not internal algorithms.
- Future onboarding must not exceed three primary steps without explicit product
  justification.
- Avoid creating additional panels/cards when hierarchy can communicate the same
  information.
- Preserve simulation disclosure without mechanically repeating it next to every
  value.
- Complexity belongs in the engine, not by default in the interface.

Keep this operational and compact.

# 9. DOCUMENTATION_MASTER_PROMPT.md

This file must contain this entire prompt verbatim.

Do not summarize it.

Do not turn it into project documentation.

It is an audit/execution artifact showing the canonical instructions used for the
documentation rewrite.

# DOCUMENT CONSISTENCY RULES

All documentation must agree on:

- the same product thesis;
- the same architecture;
- the same customer/Blinkit distinction;
- the same current dataset counts;
- the same simulation limitations;
- the same current vs planned behavior;
- the same three-step target onboarding;
- the same UI simplicity principles;
- the same terminology.

Preferred terminology:

- Household intelligence
- Kitchen State
- Catalog
- Household facts
- Derived intelligence
- Customer experience
- Blinkit Lens
- Simulated household
- Canonical ingredient
- Recipe requirement
- Pantry-aware basket
- Ingredient reuse
- Ingredient chaining
- Use-soon
- Replenishment
- Substitution
- Household learning

Avoid unnecessary competing labels.

# COPY STYLE

Use plain, precise language.

Avoid:

- hype;
- startup jargon;
- excessive technical language on customer-facing descriptions;
- "AI-powered" unless actually relevant;
- unnecessary em dashes;
- exaggerated claims;
- claiming prediction when logic is heuristic;
- treating simulation as customer evidence;
- repeating the same explanation across multiple docs.

Prefer headings and diagrams over long paragraphs where appropriate.

Prefer one strong sentence over three weak ones.

Use tables when they make comparison easier.

Use simple ASCII/Markdown diagrams.

Avoid 30-page-document syndrome.

The documentation can be comprehensive without being repetitive.

# CUSTOMER COPY PRINCIPLES TO DOCUMENT

Examples:

Avoid:

"Derived from your consumption history, not guesswork."

Prefer:

"You use this often and you're running low."

Avoid:

"Pantry-aware basket coverage."

Prefer:

"68% already at home."

Avoid:

"Substitution affinity increased."

Prefer:

"You've accepted this swap before."

Avoid:

"Ingredient chaining opportunity."

Prefer:

"Buy once, use in 3 meals."

Internal and strategy documentation can use precise technical terminology.

Customer UI should describe outcomes.

# IMPORTANT NON-NEGOTIABLE PRINCIPLES

1. Do not rewrite the software architecture.
2. Do not modify code.
3. Do not modify tests.
4. Do not modify JSON/data files.
5. Do not modify config.
6. Do not implement planned functionality.
7. Do not invent current functionality.
8. Do not hide current limitations.
9. Do not treat simulation as empirical validation.
10. Do not turn Blinkitchen into a recipe app.
11. Do not turn Blinkitchen into an infrastructure showcase.
12. Do not add a runtime LLM merely because the product is called intelligent.
13. Do not introduce unnecessary abstractions.
14. Keep the PM/product objective central.
15. Keep onboarding at THREE target steps.
16. Optimize customer-facing UX for brevity and hierarchy.
17. Do not expose every engine output simultaneously.
18. Preserve technical explainability through progressive disclosure.
19. Keep the simulated reviewer path extremely fast.
20. Persist facts. Derive intelligence.

# CROSS-DOCUMENT REVIEW

After writing all documents, perform a final consistency pass.

Check specifically:

- Does any doc still describe a five-step target onboarding?
- Does any doc imply onboarding should collect perfect inventory?
- Does any doc overclaim plan-level ingredient optimization?
- Does any doc present simulation output as customer evidence?
- Are the dataset counts consistent?
- Are current and planned capabilities clearly separated?
- Does README link to PRODUCT_CASE and DATA_STRATEGY?
- Does PRODUCT_CASE contain the experiment and metrics?
- Does DATA_STRATEGY describe the offline normalization pipeline?
- Does SIMULATION contain the assumptions distinction?
- Does ARCHITECTURE preserve the one-state-authority model?
- Does DATA_MODEL match actual code?
- Is AGENTS.md still short?
- Do UI principles consistently favor less copy?
- Is the reviewer journey obvious?
- Is "See the 8-week demo" documented as the preferred review path?
- Are planned UX examples clearly labeled as future direction?
- Does every document use approximately the same product vocabulary?

Fix inconsistencies before finishing.

# FINAL DELIVERABLE

After completing the documentation edits, return a concise report containing:

1. Starting HEAD SHA.
2. Final HEAD / working-tree status if relevant.
3. Markdown files modified.
4. Markdown files created.
5. Confirmation that `DOCUMENTATION_MASTER_PROMPT.md` contains the complete prompt.
6. Current repository facts verified from code.
7. Stale or incorrect documentation corrected.
8. Current implementation limitations documented.
9. Product/PM framing added.
10. Three-step onboarding direction documented.
11. UI/UX simplification principles documented.
12. Data strategy documented.
13. Simulation assumptions clarified.
14. Experiment and metrics framework documented.
15. Remaining gaps between current implementation and target product direction.
16. Confirmation that NO executable/code/test/config/data files were changed.

Do not stop after creating `DOCUMENTATION_MASTER_PROMPT.md`.

Do not merely produce a plan.

Actually edit and create all required Markdown documents in the repository.

Do not implement application features.

Do not change code.

The final documentation system should leave Blinkitchen positioned as:

- a technically disciplined household-grocery-intelligence prototype;
- a simple and understandable customer concept;
- a credible Blinkit product case;
- an honest simulated demonstration rather than fabricated evidence;
- a product with a clear experiment and measurement strategy;
- and a portfolio artifact that demonstrates strong product-management thinking.

The final product philosophy should be unmistakable:

ASK LESS
    ↓
LEARN OVER TIME
    ↓
UNDERSTAND THE KITCHEN
    ↓
MAKE BETTER GROCERY DECISIONS
    ↓
SHOW ONLY WHAT THE USER NEEDS NOW

Save this complete prompt first.

Then perform the full documentation rewrite immediately.

WRITE NEW DOCS AND THEN WRITE IMPLEMENTATION PLAN
# Product Scope

## What we are building

A prototype that demonstrates what a **household intelligence layer** for a grocery
app could be. The product thesis:

> Grocery apps usually understand carts and transactions. Blinkitchen tries to
> understand the kitchen itself over time.

The prototype shows how knowledge of a household's pantry, preferences, cooking
routine, cuisines, consumption, waste, substitutions and feedback could improve
future grocery recommendations. The point is to make a Blinkit product or strategy
team *feel* the following ideas:

1. What household intelligence means.
2. How it accumulates over time (Weeks 1–8).
3. Why recommendations improve with repeated observations.
4. How existing pantry stock reduces unnecessary purchases.
5. How ingredients get reused across meals ("buy once, use across three meals").
6. How substitutions can be learned from accept/reject decisions.
7. How replenishment can become predictive and explainable.
8. What strategic signals Blinkit could derive from household behaviour.

## Who it is for

- Blinkit product/strategy reviewers evaluating the concept.
- Engineers evaluating the architecture as a portfolio artifact.
- Anyone who wants to replay the intelligence loop in a browser in under a minute.

## The two audiences in the product

- **Customer experience** (`/build`, `/kitchen`): what the household sees — pantry,
  suggested meals, why they fit, basket, substitutions, replenishments, learning.
- **Blinkit lens** (`/blinkit`): the strategy projection across simulated
  households — recurring missing ingredients, reuse patterns, avoided basket
  demand, archetype differences.

## Simulation honesty

All products, prices, availability and households in the prototype are
**simulated**. The UI labels this everywhere it matters. Nothing in `/blinkit`
represents real Blinkit users, demand or inventory.

## Explicitly out of scope

Authentication, accounts, sessions, roles, databases, server-side storage,
payments, checkout, orders, delivery, warehouse/provider operations, real Blinkit
APIs, real pricing, notifications, email/SMS, LLMs, embeddings, vector databases,
ML infrastructure, microservices, queues, event buses, GraphQL, Redux/Zustand,
generic repository layers, and any infrastructure that does not make household
intelligence more visible.

## Success test

A viewer can understand Blinkitchen from `/`, build a household, see Week 1
intelligence, advance weeks, watch recommendations change, explore the four
simulated households through Week 8, and inspect the simulated Blinkit-level
insights — with every significant recommendation explaining itself in plain
language.

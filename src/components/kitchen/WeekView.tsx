"use client";

import type { ReactNode } from "react";
import { formatRupees } from "@/domain/units";
import { WEEK_MAX } from "@/domain/kitchen/types";
import type { Catalog } from "@/catalog/types";
import type { KitchenState, SubstitutionDecision } from "@/domain/kitchen/types";
import type { WeekIntelligence } from "@/intelligence";
import { MEAL_WEIGHTS } from "@/intelligence/meals";
import { BasketPanel } from "@/components/kitchen/BasketPanel";
import { ChainPanel } from "@/components/kitchen/ChainPanel";
import { JourneyBar } from "@/components/kitchen/JourneyBar";
import { LearningPanel } from "@/components/kitchen/LearningPanel";
import { MealCard } from "@/components/kitchen/MealCard";
import { MetricRow } from "@/components/kitchen/MetricRow";
import { PantrySnapshot } from "@/components/kitchen/PantrySnapshot";
import { ReplenishmentPanel } from "@/components/kitchen/ReplenishmentPanel";
import { SmartExtras } from "@/components/kitchen/SmartExtras";
import { SubstitutionPanel } from "@/components/kitchen/SubstitutionPanel";
import { WeekHeader } from "@/components/kitchen/WeekHeader";
import { useWeekScrollAnchor } from "@/components/kitchen/use-week-scroll";
import styles from "@/components/kitchen/kitchen.module.css";

const VISIBLE_DISCOVERY_MEALS = 3;

/** Display order for the scoring breakdown, matching MEAL_WEIGHTS. */
const FACTOR_ORDER = [
  "pantryFit",
  "cuisineFit",
  "ingredientReuse",
  "budgetFit",
  "convenience",
  "useSoonBenefit",
] as const satisfies readonly (keyof typeof MEAL_WEIGHTS)[];

const FACTOR_LABELS = {
  pantryFit: "Pantry fit",
  cuisineFit: "Cuisine fit",
  ingredientReuse: "Ingredient reuse",
  budgetFit: "Budget fit",
  convenience: "Convenience",
  useSoonBenefit: "Use-soon benefit",
} satisfies Record<keyof typeof MEAL_WEIGHTS, string>;

/**
 * The shared week projection surface. Both the simulated explore journey and
 * the interactive kitchen render this component; it only consumes derived
 * intelligence and explicit kitchen facts.
 *
 * Hierarchy: your kitchen → this week's plan → basket → smart extras → what
 * changed. Engine depth stays available behind disclosure, never at equal
 * visual weight.
 */
export function WeekView({
  kitchen,
  catalog,
  intelligence,
  householdName,
  journeyContext,
  badges,
  weekNav,
  headerActions,
  mealsHeaderAction,
  mealPlanner,
  feedbackSlot,
  substitutionDecisions,
  onSubstitutionDecision,
  renderMealAction,
  mealsHeading = "What you could cook",
}: {
  kitchen: KitchenState;
  catalog: Catalog;
  intelligence: WeekIntelligence;
  householdName: string;
  journeyContext?: string;
  badges?: ReactNode;
  /** Week navigation rendered inside the sticky journey bar. */
  weekNav?: ReactNode;
  headerActions?: ReactNode;
  mealsHeaderAction?: ReactNode;
  mealPlanner?: ReactNode;
  feedbackSlot?: ReactNode;
  substitutionDecisions?: SubstitutionDecision[];
  onSubstitutionDecision?: (substitutionId: string, accepted: boolean) => void;
  renderMealAction?: (recipeId: string, planned: boolean) => ReactNode;
  mealsHeading?: string;
}) {
  const anchorRef = useWeekScrollAnchor(kitchen.week);

  const recommendationByRecipeId = new Map(
    intelligence.recommendations.map((recommendation) => [recommendation.recipe.id, recommendation]),
  );

  const plannedIds = new Set(intelligence.plan.map((meal) => meal.recipeId));

  const planCards = intelligence.plan.flatMap((meal) => {
    const recommendation = recommendationByRecipeId.get(meal.recipeId);

    return recommendation ? [{ meal, recommendation }] : [];
  });

  const discoveryCards = intelligence.recommendations
    .filter((recommendation) => !plannedIds.has(recommendation.recipe.id))
    .slice(0, VISIBLE_DISCOVERY_MEALS);

  const toBuyCount = intelligence.basket.items.filter((item) => item.status === "buy").length;

  const useSoonNames = intelligence.useSoon
    .map((entry) => entry.ingredient.name)
    .slice(0, 3);

  const extrasCount =
    intelligence.substitutions.length + intelligence.replenishments.length + intelligence.chains.length;

  return (
    <div ref={anchorRef}>
      <h1 className="sr-only">
        {householdName} — Week {kitchen.week} of {WEEK_MAX}
      </h1>
      <p className="sr-only" role="status">
        Week {kitchen.week} of {WEEK_MAX}. {intelligence.plan.length} meals planned. Simulated
        basket {formatRupees(intelligence.basket.totalCost)}. Pantry coverage{" "}
        {Math.round(intelligence.coverage.percent)} percent.
      </p>

      <JourneyBar
        title={householdName}
        {...(journeyContext ? { context: journeyContext } : {})}
        {...(weekNav ? { rail: weekNav } : {})}
        {...(headerActions ? { actions: headerActions } : {})}
      />

      <section className={styles.weekBlock} aria-label="Your kitchen this week">
        <WeekHeader
          week={kitchen.week}
          householdName={householdName}
          {...(badges ? { badges } : {})}
        />
        <MetricRow intelligence={intelligence} />
        <p className={styles.useSoonLine}>
          {useSoonNames.length > 0
            ? `Use first: ${useSoonNames.join(", ")}${intelligence.useSoon.length > useSoonNames.length ? ` +${intelligence.useSoon.length - useSoonNames.length} more` : ""}.`
            : "Nothing needs rescuing this week."}
        </p>
        {feedbackSlot}
        <PantrySnapshot kitchen={kitchen} catalog={catalog} />
      </section>

      {mealPlanner}

      <section className={styles.panel} aria-label="Recommended meals">
        <div className={styles.panelHeader}>
          <div>
            <h3 className={styles.panelTitle}>This week&apos;s plan</h3>
            <p className={styles.panelHint}>
              {intelligence.planSource === "selected"
                ? "Your selected meals, explained against the rest of the week"
                : `Suggested plan of ${intelligence.plan.length} meals from your cooking routine`}
            </p>
          </div>
          {mealsHeaderAction ? <div className={styles.actionRow}>{mealsHeaderAction}</div> : null}
        </div>

        {planCards.length > 0 ? (
          <div className={styles.mealGrid}>
            {planCards.map(({ meal, recommendation }) => (
              <MealCard
                key={meal.recipeId}
                recommendation={recommendation}
                planned
                planBadge={intelligence.planSource === "selected" ? "In this week's plan" : "Suggested for you"}
                catalog={catalog}
                planExplanation={meal.explanation}
                {...(renderMealAction ? { action: renderMealAction(meal.recipeId, true) } : {})}
              />
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>
            No meals planned yet. Pick dishes from the list below to build this week.
          </p>
        )}

        {discoveryCards.length > 0 ? (
          <details className={styles.scoreNote}>
            <summary className={styles.detailsToggle}>
              {mealsHeading} · {discoveryCards.length} suggestions
            </summary>
            <div className={`${styles.mealGrid} ${styles.detailsBody}`}>
              {discoveryCards.map((recommendation) => (
                <MealCard
                  key={recommendation.recipe.id}
                  recommendation={recommendation}
                  catalog={catalog}
                  {...(renderMealAction
                    ? { action: renderMealAction(recommendation.recipe.id, false) }
                    : {})}
                />
              ))}
            </div>
          </details>
        ) : null}

        <details className={styles.scoreNote}>
          <summary className={styles.detailsToggle}>How the fit score is calculated</summary>
          <p>
            Each meal is scored from your current facts, deterministically, and the weights are
            fixed:
          </p>
          <ul>
            {FACTOR_ORDER.map((factor) => (
              <li key={factor}>
                {FACTOR_LABELS[factor]}: {Math.round(MEAL_WEIGHTS[factor] * 100)}%
              </li>
            ))}
          </ul>
          <p>
            The plan then chooses meals one slot at a time against the partial week: pantry
            coverage, shared ingredients, use-soon rescue, variety and incremental cost. Skipped
            meals lose 25 points; meals cooked in the last two weeks lose 8 points each.
          </p>
        </details>
      </section>

      <BasketPanel basket={intelligence.basket} toBuyCount={toBuyCount} />

      <SmartExtras count={extrasCount}>
        <ChainPanel chains={intelligence.chains} />
        <SubstitutionPanel
          suggestions={intelligence.substitutions}
          decisions={substitutionDecisions}
          {...(onSubstitutionDecision ? { onDecision: onSubstitutionDecision } : {})}
        />
        <ReplenishmentPanel replenishments={intelligence.replenishments} />
      </SmartExtras>

      <LearningPanel intelligence={intelligence} kitchen={kitchen} catalog={catalog} />
    </div>
  );
}

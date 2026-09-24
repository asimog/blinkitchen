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
import { SubstitutionPanel } from "@/components/kitchen/SubstitutionPanel";
import { WeekHeader } from "@/components/kitchen/WeekHeader";
import { useWeekScrollAnchor } from "@/components/kitchen/use-week-scroll";
import styles from "@/components/kitchen/kitchen.module.css";

const VISIBLE_MEAL_CARDS = 3;

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
  const plannedIds = new Set(intelligence.plan.map((meal) => meal.recipeId));

  const planBadge =
    intelligence.planSource === "suggested" ? "Suggested for you" : "In this week's plan";

  const cards = intelligence.recommendations.slice(0, VISIBLE_MEAL_CARDS);
  const rest = intelligence.recommendations.slice(VISIBLE_MEAL_CARDS);
  const toBuyCount = intelligence.basket.items.filter((item) => item.status === "buy").length;

  const renderCard = (recommendation: WeekIntelligence["recommendations"][number]) => (
    <MealCard
      key={recommendation.recipe.id}
      recommendation={recommendation}
      planned={plannedIds.has(recommendation.recipe.id)}
      planBadge={planBadge}
      catalog={catalog}
      {...(renderMealAction
        ? {
            action: renderMealAction(
              recommendation.recipe.id,
              plannedIds.has(recommendation.recipe.id),
            ),
          }
        : {})}
    />
  );

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
      <WeekHeader week={kitchen.week} householdName={householdName} {...(badges ? { badges } : {})} />
      <MetricRow intelligence={intelligence} />
      {feedbackSlot}
      <PantrySnapshot kitchen={kitchen} catalog={catalog} />
      {mealPlanner}

      <section className={styles.panel} aria-label="Recommended meals">
        <div className={styles.panelHeader}>
          <div>
            <h3 className={styles.panelTitle}>{mealsHeading}</h3>
            <p className={styles.panelHint}>
              {intelligence.planSource === "selected"
                ? "Your selected meals are marked in the plan"
                : `Suggested plan of ${intelligence.plan.length} dinners from your cooking routine`}
              {intelligence.recommendations.length > cards.length
                ? ` · top ${cards.length} of ${intelligence.recommendations.length} ranked`
                : ""}
            </p>
          </div>
          {mealsHeaderAction ? <div className={styles.actionRow}>{mealsHeaderAction}</div> : null}
        </div>
        <div className={styles.mealGrid}>{cards.map(renderCard)}</div>
        {rest.length > 0 ? (
          <details>
            <summary className={styles.detailsToggle}>
              Show {rest.length} more ranked meals
            </summary>
            <div className={`${styles.mealGrid} ${styles.detailsBody}`}>{rest.map(renderCard)}</div>
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
            Skipped meals lose 25 points; meals cooked in the last two weeks lose 8 points each.
            Everything else you see on this page is derived from the same facts.
          </p>
        </details>
      </section>

      <ChainPanel chains={intelligence.chains} />
      <BasketPanel basket={intelligence.basket} toBuyCount={toBuyCount} />
      <SubstitutionPanel
        suggestions={intelligence.substitutions}
        decisions={substitutionDecisions}
        {...(onSubstitutionDecision ? { onDecision: onSubstitutionDecision } : {})}
      />
      <ReplenishmentPanel replenishments={intelligence.replenishments} />
      <LearningPanel intelligence={intelligence} kitchen={kitchen} catalog={catalog} />
    </div>
  );
}
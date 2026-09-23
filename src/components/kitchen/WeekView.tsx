import type { ReactNode } from "react";
import type { Catalog } from "@/catalog/types";
import type { KitchenState, SubstitutionDecision } from "@/domain/kitchen/types";
import type { WeekIntelligence } from "@/intelligence";
import { BasketPanel } from "@/components/kitchen/BasketPanel";
import { ChainPanel } from "@/components/kitchen/ChainPanel";
import { LearningPanel } from "@/components/kitchen/LearningPanel";
import { MealCard } from "@/components/kitchen/MealCard";
import { MetricRow } from "@/components/kitchen/MetricRow";
import { PantrySnapshot } from "@/components/kitchen/PantrySnapshot";
import { ReplenishmentPanel } from "@/components/kitchen/ReplenishmentPanel";
import { SubstitutionPanel } from "@/components/kitchen/SubstitutionPanel";
import { WeekHeader } from "@/components/kitchen/WeekHeader";
import styles from "@/components/kitchen/kitchen.module.css";

const MAX_MEAL_CARDS = 6;

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
  badges,
  headerActions,
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
  badges?: ReactNode;
  headerActions?: ReactNode;
  feedbackSlot?: ReactNode;
  substitutionDecisions?: SubstitutionDecision[];
  onSubstitutionDecision?: (substitutionId: string, accepted: boolean) => void;
  renderMealAction?: (recipeId: string, planned: boolean) => ReactNode;
  mealsHeading?: string;
}) {
  const plannedIds = new Set(intelligence.plan.map((meal) => meal.recipeId));
  const cards = intelligence.recommendations.slice(0, MAX_MEAL_CARDS);

  return (
    <div>
      <h1 className="sr-only">
        {householdName} — Week {kitchen.week} of 8
      </h1>
      <WeekHeader
        week={kitchen.week}
        householdName={householdName}
        badges={badges}
        actions={headerActions}
      />
      <MetricRow intelligence={intelligence} />
      <PantrySnapshot kitchen={kitchen} catalog={catalog} />

      <section className={styles.panel} aria-label="Recommended meals">
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>{mealsHeading}</h3>
          <p className={styles.panelHint}>
            {intelligence.planSource === "selected"
              ? "Your selected meals are marked in the plan"
              : `Suggested plan of ${intelligence.plan.length} meals from your cooking routine`}
            {intelligence.recommendations.length > cards.length
              ? ` · top ${cards.length} of ${intelligence.recommendations.length} ranked`
              : ""}
          </p>
        </div>
        <div className={styles.mealGrid}>
          {cards.map((recommendation) => (
            <MealCard
              key={recommendation.recipe.id}
              recommendation={recommendation}
              planned={plannedIds.has(recommendation.recipe.id)}
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
          ))}
        </div>
      </section>

      <ChainPanel chains={intelligence.chains} />
      {feedbackSlot}
      <BasketPanel basket={intelligence.basket} />
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

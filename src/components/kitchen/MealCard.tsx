import type { ReactNode } from "react";
import { formatRupees } from "@/domain/units";
import { ingredientById } from "@/catalog/grocery-graph";
import type { Catalog, PreparationComplexity } from "@/catalog/types";
import type { MealRecommendation } from "@/intelligence";
import { humanizeId } from "@/intelligence";
import { percent } from "@/components/kitchen/format";
import styles from "@/components/kitchen/kitchen.module.css";

const COMPLEXITY_LABEL = {
  low: "Easy",
  medium: "Medium effort",
  high: "Project cook",
} satisfies Record<PreparationComplexity, string>;

const VISIBLE_REASONS = 2;

export function MealCard({
  recommendation,
  planned,
  planBadge = "In this week's plan",
  catalog,
  action,
  planExplanation,
}: {
  recommendation: MealRecommendation;
  planned?: boolean;
  /** Label for the planned badge; the caller distinguishes suggested from chosen. */
  planBadge?: string;
  catalog: Catalog;
  /** Optional interactive control (e.g. add to plan) rendered in the footer. */
  action?: ReactNode;
  /**
   * Plan-level reasoning from the weekly planner. Falls back to the per-recipe
   * explanation when the caller has no plan context.
   */
  planExplanation?: string[];
}) {
  const { recipe, impact, explanation, score } = recommendation;
  const fit = Math.max(0, Math.round(score * 100));

  const reasons = (planExplanation && planExplanation.length > 0 ? planExplanation : explanation).slice(
    0,
    VISIBLE_REASONS,
  );

  const nameOf = (ingredientId: string) =>
    ingredientById(catalog, ingredientId)?.name ?? ingredientId;

  const owned = impact.ownedIngredientIds;
  const missing = impact.missingIngredientIds;

  return (
    <article className={`${styles.mealCard} ${planned ? styles.mealCardPlanned : ""}`}>
      <div className={styles.mealTop}>
        <h4 className={styles.mealName}>{recipe.name}</h4>
        {planned ? <span className="pill pill-positive">{planBadge}</span> : null}
      </div>

      <div className={styles.impactRow}>
        <span className={styles.impactCost}>
          {impact.additionalCost > 0 ? `${formatRupees(impact.additionalCost)} additional` : "Nothing extra to buy"}
        </span>
        <span className="muted small">{percent(impact.coveragePercent)} already home</span>
      </div>

      <ul className={styles.whyList}>
        {reasons.map((line) => (
          <li key={line} className={styles.whyItem}>
            {line}
          </li>
        ))}
      </ul>

      <div className={styles.cardFooter}>
        <span>{recipe.estimatedPreparationMinutes} min</span>
        <span aria-hidden>·</span>
        <span>{COMPLEXITY_LABEL[recipe.preparationComplexity]}</span>
        <span aria-hidden>·</span>
        <span>{humanizeId(recipe.cuisine)}</span>
        {recipe.discoveryLevel === "explore" ? (
          <span className="pill pill-accent">A little new</span>
        ) : null}
      </div>

      {action ? <div className={styles.actionRow}>{action}</div> : null}

      <details className={styles.scoreNote}>
        <summary className={styles.detailsToggle}>Why this?</summary>
        <div className={styles.ingredientColumns}>
          <div>
            <p className={styles.ingredientColTitle}>In your kitchen</p>
            <ul className={styles.chipList} aria-label={`Ingredients already in your kitchen for ${recipe.name}`}>
              {owned.slice(0, 6).map((id) => (
                <li key={id} className={`pill ${styles.chipOk}`}>
                  {nameOf(id)}
                </li>
              ))}
              {owned.length === 0 ? <li className="small muted">nothing yet</li> : null}
              {owned.length > 6 ? (
                <li className="small muted">+{owned.length - 6} more</li>
              ) : null}
            </ul>
          </div>
          <div>
            <p className={styles.ingredientColTitle}>Need</p>
            <ul className={styles.chipList} aria-label={`Ingredients to buy for ${recipe.name}`}>
              {missing.slice(0, 6).map((id) => (
                <li key={id} className={`pill ${styles.chipNeed}`}>
                  + {nameOf(id)}
                </li>
              ))}
              {missing.length === 0 ? <li className="small muted">nothing to buy</li> : null}
              {missing.length > 6 ? (
                <li className="small muted">+{missing.length - 6} more</li>
              ) : null}
            </ul>
          </div>
        </div>
        <p className={styles.mealFactors}>
          Fit {fit} — pantry {Math.round(recommendation.factors.pantryFit * 100)} · cuisine{" "}
          {Math.round(recommendation.factors.cuisineFit * 100)} · reuse{" "}
          {Math.round(recommendation.factors.ingredientReuse * 100)}
        </p>
        <p className="small muted" style={{ margin: 0 }}>
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
            Blinkit recipe
          </a>
        </p>
      </details>
    </article>
  );
}

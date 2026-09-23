import type { SubstitutionDecision } from "@/domain/kitchen/types";
import type { SubstitutionSuggestion } from "@/intelligence";
import styles from "@/components/kitchen/kitchen.module.css";

export function SubstitutionPanel({
  suggestions,
  decisions,
  onDecision,
}: {
  suggestions: SubstitutionSuggestion[];
  /** Decisions already recorded for the displayed week. */
  decisions?: SubstitutionDecision[];
  /** When provided, the household can accept or keep the original. */
  onDecision?: (substitutionId: string, accepted: boolean) => void;
}) {
  return (
    <section className={styles.panel} aria-label="Suggested swaps">
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Suggested swaps</h3>
        <p className={styles.panelHint}>Explicit ingredient relationships — no guessing</p>
      </div>

      {suggestions.length === 0 ? (
        <p className={styles.emptyState}>
          Nothing to swap this week: every missing ingredient has a straightforward SKU.
        </p>
      ) : (
        <div className="stack">
          {suggestions.map((suggestion) => {
            const decision = decisions?.find(
              (row) => row.substitutionId === suggestion.substitution.id,
            );

            return (
              <article key={suggestion.substitution.id} className={styles.suggestionCard}>
                <div className={styles.suggestionHeading}>
                  <span>
                    {suggestion.requestedIngredient.name}
                    <span className={styles.arrow} aria-hidden>
                      {" "}
                      →{" "}
                    </span>
                    {suggestion.substituteIngredient.name}
                  </span>
                  <span className="pill pill-info">{Math.round(suggestion.score * 100)}% match</span>
                  {decision ? (
                    <span
                      className={`pill ${
                        decision.accepted ? styles.decisionAccepted : styles.decisionRejected
                      }`}
                    >
                      {decision.accepted ? "Accepted this week" : "Kept the original"}
                    </span>
                  ) : null}
                </div>
                <ul className={styles.whyList}>
                  {suggestion.explanation.map((line) => (
                    <li key={line} className={styles.whyItem}>
                      {line}
                    </li>
                  ))}
                </ul>
                {onDecision && !decision ? (
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={() => onDecision(suggestion.substitution.id, true)}
                    >
                      Swap to {suggestion.substituteIngredient.name}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => onDecision(suggestion.substitution.id, false)}
                    >
                      Keep {suggestion.requestedIngredient.name}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

import type { ReplenishmentSuggestion } from "@/intelligence";
import styles from "@/components/kitchen/kitchen.module.css";

export function ReplenishmentPanel({
  replenishments,
}: {
  replenishments: ReplenishmentSuggestion[];
}) {
  return (
    <section className={styles.panel} aria-label="Replenishment prompts">
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>What may need replenishing</h3>
        <p className={styles.panelHint}>Derived from your consumption history, not guesswork</p>
      </div>

      {replenishments.length === 0 ? (
        <p className={styles.emptyState}>
          No recurring shortage yet. Replenishment prompts appear once a used ingredient runs low
          across several weeks.
        </p>
      ) : (
        <div className="stack">
          {replenishments.map((suggestion) => (
            <article key={suggestion.ingredientId} className={styles.suggestionCard}>
              <div className={styles.suggestionHeading}>
                <span>{suggestion.ingredient.name}</span>
                <span className="pill pill-warning">
                  {Math.round(suggestion.score * 100)}% confidence
                </span>
              </div>
              <ul className={styles.whyList}>
                {suggestion.explanation.map((line) => (
                  <li key={line} className={styles.whyItem}>
                    {line}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

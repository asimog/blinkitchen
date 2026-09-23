import { ingredientById } from "@/catalog/grocery-graph";
import { compareStrings } from "@/domain/order";
import type { Catalog } from "@/catalog/types";
import type { KitchenState } from "@/domain/kitchen/types";
import type { WeekIntelligence } from "@/intelligence";
import { humanizeId } from "@/intelligence";
import styles from "@/components/kitchen/kitchen.module.css";

export function LearningPanel({
  intelligence,
  kitchen,
  catalog,
}: {
  intelligence: WeekIntelligence;
  kitchen: KitchenState;
  catalog: Catalog;
}) {
  const { learning } = intelligence;

  const cuisines = Object.entries(learning.cuisineAffinity).sort(
    (a, b) => b[1] - a[1] || compareStrings(a[0], b[0]),
  );

  const substitutionMemory = Object.entries(learning.substitutionAffinity).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1]) || compareStrings(a[0], b[0]),
  );

  const nameOf = (ingredientId: string) =>
    ingredientById(catalog, ingredientId)?.name ?? ingredientId;

  return (
    <section className={styles.panel} aria-label="What Blinkitchen learned">
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>What Blinkitchen learned</h3>
        <p className={styles.panelHint}>
          {kitchen.mealFacts.length} meals and {kitchen.groceryFacts.length} grocery lines of
          recorded history
        </p>
      </div>

      <div className={styles.learningGrid}>
        <div>
          <p className={styles.signalGroupTitle}>This week</p>
          <ul className={styles.narrativeList}>
            {intelligence.narrative.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div>
          {cuisines.length > 0 ? (
            <>
              <p className={styles.signalGroupTitle}>Cuisine affinity</p>
              {cuisines.map(([cuisine, affinity]) => (
                <div key={cuisine} className={styles.signalRow}>
                  <span className={styles.signalLabel}>{humanizeId(cuisine)}</span>
                  <div className={styles.barTrack} aria-hidden>
                    <div className={styles.barFill} style={{ width: `${Math.round(affinity * 100)}%` }} />
                  </div>
                  <span className={styles.signalValue}>{Math.round(affinity * 100)}%</span>
                </div>
              ))}
            </>
          ) : null}

          {substitutionMemory.length > 0 ? (
            <>
              <p className={styles.signalGroupTitle}>Substitution memory</p>
              <ul className={styles.chipList}>
                {substitutionMemory.map(([key, affinity]) => {
                  const [requested, substitute] = key.split("->");

                  return (
                    <li
                      key={key}
                      className={`pill ${
                        affinity > 0 ? styles.decisionAccepted : styles.decisionRejected
                      }`}
                    >
                      {nameOf(requested ?? "")} → {nameOf(substitute ?? "")}{" "}
                      {affinity > 0 ? "accepted" : "rejected"}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          {learning.frequentIngredients.length > 0 ? (
            <>
              <p className={styles.signalGroupTitle}>Frequently used</p>
              <ul className={styles.chipList}>
                {learning.frequentIngredients.slice(0, 6).map((row) => (
                  <li key={row.ingredientId} className="pill">
                    {nameOf(row.ingredientId)} · {row.uses}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {learning.wastedIngredients.length > 0 ? (
            <>
              <p className={styles.signalGroupTitle}>Waste signals</p>
              <ul className={styles.chipList}>
                {learning.wastedIngredients.slice(0, 4).map((row) => (
                  <li key={row.ingredientId} className="pill pill-warning">
                    {nameOf(row.ingredientId)} wasted {row.wasteEvents}×
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

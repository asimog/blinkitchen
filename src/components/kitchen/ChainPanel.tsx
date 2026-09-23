import { formatQuantity } from "@/domain/units";
import type { IngredientChain } from "@/intelligence";
import styles from "@/components/kitchen/kitchen.module.css";

export function ChainPanel({ chains }: { chains: IngredientChain[] }) {
  return (
    <section className={styles.panel} aria-label="Ingredient chaining">
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Buy once, use across meals</h3>
        <p className={styles.panelHint}>
          {chains.length > 0
            ? `${chains.length} shared ${chains.length === 1 ? "ingredient" : "ingredients"} across this week's plan`
            : "no shared ingredients in this plan yet"}
        </p>
      </div>
      {chains.length === 0 ? (
        <p className={styles.emptyState}>
          Pick meals that share ingredients and Blinkitchen will show the reuse here.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {chains.slice(0, 6).map((chain) => (
            <li key={chain.ingredientId} className={styles.chainRow}>
              <div className={styles.chainIngredient}>
                {chain.ingredient.name}
                <div className="small muted">
                  {formatQuantity(chain.totalRequired, chain.unit)} total
                </div>
              </div>
              <div>
                <ul className={styles.chainMeals} aria-label={`Meals using ${chain.ingredient.name}`}>
                  {chain.recipeNames.map((name) => (
                    <li key={name} className="pill">
                      {name}
                    </li>
                  ))}
                </ul>
                <p className={styles.chainNote}>{chain.explanation}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

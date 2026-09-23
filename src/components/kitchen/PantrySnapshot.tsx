import { ingredientById } from "@/catalog/grocery-graph";
import { compareStrings } from "@/domain/order";
import type { Catalog } from "@/catalog/types";
import type { KitchenState } from "@/domain/kitchen/types";
import { displayQuantity } from "@/components/kitchen/format";
import styles from "@/components/kitchen/kitchen.module.css";

export function PantrySnapshot({ kitchen, catalog }: { kitchen: KitchenState; catalog: Catalog }) {
  const items = [...kitchen.pantry].sort((a, b) =>
    compareStrings(
      ingredientNameOf(a.ingredientId),
      ingredientNameOf(b.ingredientId),
    ),
  );

  const starters = kitchen.profile.starterIngredientIds
    .map((id) => ingredientById(catalog, id))
    .filter((ingredient) => Boolean(ingredient));

  function ingredientNameOf(ingredientId: string): string {
    return ingredientById(catalog, ingredientId)?.name ?? ingredientId;
  }

  return (
    <section className={`${styles.panel}`} aria-label="What you already have">
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>What you already have</h3>
        <p className={styles.panelHint}>
          {items.length} {items.length === 1 ? "ingredient" : "ingredients"} in the pantry
        </p>
      </div>
      {items.length === 0 ? (
        <p className={styles.emptyState}>
          This kitchen starts empty. Week 1 recommendations will fill the pantry.
        </p>
      ) : (
        <ul className={styles.chipRow} aria-label="Pantry items">
          {items.map((item) => {
            const name = ingredientById(catalog, item.ingredientId)?.name ?? item.ingredientId;

            return (
              <li key={`${item.ingredientId}-${item.unit}`} className={styles.pantryChip}>
                <strong>{name}</strong>
                <span className={styles.quantity}>{displayQuantity(item.quantity, item.unit)}</span>
                {item.useSoon ? <span className={styles.useSoonTag}>use soon</span> : null}
              </li>
            );
          })}
        </ul>
      )}
      {starters.length > 0 ? (
        <p className="small muted" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
          Planning to stock: {starters.map((ingredient) => ingredient?.name).join(", ")}.
        </p>
      ) : null}
    </section>
  );
}

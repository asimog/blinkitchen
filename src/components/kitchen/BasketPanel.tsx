import { formatQuantity, formatRupees } from "@/domain/units";
import type { Basket } from "@/intelligence";
import { displayPack } from "@/components/kitchen/format";
import styles from "@/components/kitchen/kitchen.module.css";

export function BasketPanel({ basket }: { basket: Basket }) {
  return (
    <section className={styles.panel} aria-label="Pantry-aware basket">
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>What you need to buy</h3>
        <p className={styles.panelHint}>Simulated products and prices — nothing is ordered</p>
      </div>

      {basket.items.length === 0 ? (
        <p className={styles.emptyState}>No plan yet, so there is nothing to compare against your pantry.</p>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.basketTable}>
              <thead>
                <tr>
                  <th scope="col">Ingredient</th>
                  <th scope="col">Required</th>
                  <th scope="col">In pantry</th>
                  <th scope="col">To buy</th>
                  <th scope="col">Simulated SKU</th>
                  <th scope="col">Line cost</th>
                </tr>
              </thead>
              <tbody>
                {basket.items.map((item) => (
                  <tr key={`${item.ingredientId}:${item.unit}`}>
                    <td>
                      <div className={styles.badgeRow}>
                        <strong>{item.ingredient.name}</strong>
                      </div>
                      <div className="small muted">
                        used in {item.usedInRecipeIds.length}{" "}
                        {item.usedInRecipeIds.length === 1 ? "meal" : "meals"}
                      </div>
                    </td>
                    <td className={styles.numeric}>
                      {formatQuantity(item.required, item.unit)}
                    </td>
                    <td className={styles.numeric}>
                      {formatQuantity(item.owned, item.unit)}
                    </td>
                    <td className={styles.numeric}>
                      {item.status === "covered" ? (
                        <span className="pill pill-positive">covered</span>
                      ) : item.status === "unavailable" ? (
                        <span className="pill pill-warning">no SKU available</span>
                      ) : (
                        formatQuantity(item.missing, item.unit)
                      )}
                    </td>
                    <td>
                      {item.product ? (
                        <>
                          <div>
                            {item.packCount} × {item.product.name}
                          </div>
                          <div className="small muted">
                            {item.product.brand} ·{" "}
                            {displayPack(item.product.packSize, item.product.unit)} pack ·{" "}
                            {formatRupees(item.product.price)} ·{" "}
                            <span className="pill" style={{ padding: "0 0.4rem" }}>
                              simulated
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="small muted">—</span>
                      )}
                    </td>
                    <td className={styles.numeric}>
                      {item.lineCost > 0 ? formatRupees(item.lineCost) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.basketTotals}>
            <span>
              Basket total <strong>{formatRupees(basket.totalCost)}</strong>{" "}
              <span className="muted small">simulated</span>
            </span>
            <span>
              Pantry avoided <strong>{formatRupees(basket.pantryValueAvoided)}</strong>{" "}
              <span className="muted small">
                of {formatRupees(basket.requiredValue)} required
              </span>
            </span>
            <span>
              Coverage <strong>{Math.round(basket.coveragePercent)}%</strong>
            </span>
          </div>
        </>
      )}
    </section>
  );
}

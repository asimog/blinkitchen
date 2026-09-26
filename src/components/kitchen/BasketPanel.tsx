import { formatQuantity, formatRupees } from "@/domain/units";
import type { Basket, BasketItem } from "@/intelligence";
import { displayPack } from "@/components/kitchen/format";
import styles from "@/components/kitchen/kitchen.module.css";

/** Short SKU description shared by the desktop table and the mobile lines. */
function skuText(item: BasketItem): string | null {
  if (!item.product) return null;

  return `${item.packCount} × ${item.product.name} (${displayPack(item.product.packSize, item.product.unit)}, ${formatRupees(item.product.price)}) · ${item.product.brand}`;
}

function toBuyText(item: BasketItem): string {
  if (item.status === "covered") return "covered";

  if (item.status === "unavailable") return "no SKU available";

  return formatQuantity(item.missing, item.unit);
}

function BasketRow({ item }: { item: BasketItem }) {
  return (
    <tr>
      <td>
        <strong>{item.ingredient.name}</strong>
        <div className="small muted">
          used in {item.usedInRecipeIds.length}{" "}
          {item.usedInRecipeIds.length === 1 ? "meal" : "meals"}
        </div>
      </td>
      <td className={styles.numeric}>{formatQuantity(item.required, item.unit)}</td>
      <td className={styles.numeric}>{formatQuantity(item.owned, item.unit)}</td>
      <td className={styles.numeric}>
        {item.status === "buy" ? (
          toBuyText(item)
        ) : (
          <span
            className={`pill ${item.status === "covered" ? "pill-positive" : "pill-warning"}`}
          >
            {toBuyText(item)}
          </span>
        )}
      </td>
      <td>
        {item.product ? (
          <>
            <div>
              {item.packCount} × {item.product.name}
            </div>
            <div className="small muted">
              {item.product.brand} · {displayPack(item.product.packSize, item.product.unit)} pack ·{" "}
              {formatRupees(item.product.price)} · simulated
            </div>
          </>
        ) : (
          <span className="small muted">—</span>
        )}
      </td>
      <td className={styles.numeric}>{item.lineCost > 0 ? formatRupees(item.lineCost) : "—"}</td>
    </tr>
  );
}

function BasketLine({ item }: { item: BasketItem }) {
  return (
    <li className={styles.basketLine}>
      <div className={styles.basketLineTop}>
        <strong>{item.ingredient.name}</strong>
        <span className={styles.basketLineCost}>
          {item.lineCost > 0 ? formatRupees(item.lineCost) : "—"}
        </span>
      </div>
      <span className={styles.basketLineMeta}>
        need {formatQuantity(item.required, item.unit)} · have{" "}
        {formatQuantity(item.owned, item.unit)}
        {item.status === "covered"
          ? " · covered by your pantry"
          : item.status === "unavailable"
            ? " · no simulated SKU available"
            : ` · buy ${formatQuantity(item.missing, item.unit)}`}
      </span>
      {skuText(item) ? (
        <span className={styles.basketLineMeta}>{skuText(item)} · simulated</span>
      ) : null}
    </li>
  );
}

export function BasketPanel({ basket, toBuyCount }: { basket: Basket; toBuyCount: number }) {
  const buy = basket.items.filter((item) => item.status === "buy");
  const covered = basket.items.filter((item) => item.status !== "buy");

  return (
    <section className={styles.panel} aria-label="Pantry-aware basket">
      <div className={styles.panelHeader}>
        <div>
          <h3 className={styles.panelTitle}>Your basket</h3>
          <p className={styles.panelHint}>
            {toBuyCount} {toBuyCount === 1 ? "thing" : "things"} to buy ·{" "}
            {formatRupees(basket.pantryValueAvoided)} already at home · simulated products, nothing
            is ordered
          </p>
        </div>
        <p className={styles.panelValue}>{formatRupees(basket.totalCost)}</p>
      </div>

      {basket.items.length === 0 ? (
        <p className={styles.emptyState}>
          No plan yet, so there is nothing to compare against your pantry.
        </p>
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
              {buy.length > 0 ? (
                <tbody>
                  <tr className={styles.groupRow}>
                    <th scope="colgroup" colSpan={6}>
                      To buy · {buy.length}
                    </th>
                  </tr>
                  {buy.map((item) => (
                    <BasketRow key={`${item.ingredientId}:${item.unit}`} item={item} />
                  ))}
                </tbody>
              ) : null}
              {covered.length > 0 ? (
                <tbody>
                  <tr className={styles.groupRow}>
                    <th scope="colgroup" colSpan={6}>
                      Already covered by the pantry · {covered.length}
                    </th>
                  </tr>
                  {covered.map((item) => (
                    <BasketRow key={`${item.ingredientId}:${item.unit}`} item={item} />
                  ))}
                </tbody>
              ) : null}
            </table>
          </div>

          <div className={styles.basketMobile}>
            {buy.length > 0 ? (
              <>
                <p className={styles.basketGroupTitle}>To buy · {buy.length}</p>
                <ul className={styles.basketMobileList}>
                  {buy.map((item) => (
                    <BasketLine key={`${item.ingredientId}:${item.unit}-mobile`} item={item} />
                  ))}
                </ul>
              </>
            ) : null}
            {covered.length > 0 ? (
              <>
                <p className={styles.basketGroupTitle}>
                  Already covered by the pantry · {covered.length}
                </p>
                <ul className={styles.basketMobileList}>
                  {covered.map((item) => (
                    <BasketLine
                      key={`${item.ingredientId}:${item.unit}-mobile`}
                      item={item}
                    />
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <dl className={styles.basketTotals}>
            <div>
              <dt>Basket total</dt>
              <dd>{formatRupees(basket.totalCost)}</dd>
            </div>
            <div>
              <dt>Pantry avoided</dt>
              <dd>{formatRupees(basket.pantryValueAvoided)}</dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>{Math.round(basket.coveragePercent)}%</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
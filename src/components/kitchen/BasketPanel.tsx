import { Check, ShoppingBag } from "lucide-react";
import { formatQuantity, formatRupees } from "@/domain/units";
import type { Basket, BasketItem } from "@/intelligence";
import { displayPack } from "@/components/kitchen/format";
import styles from "@/components/kitchen/kitchen.module.css";

function BasketLine({ item }: { item: BasketItem }) {
  return (
    <li className={styles.basketLine}>
      <div className={styles.basketLineTop}><strong>{item.ingredient.name}</strong><span>{item.status === "covered" ? <Check size={16} aria-label="Already covered" /> : item.status === "unavailable" ? "Unavailable" : formatRupees(item.lineCost)}</span></div>
      <span className={styles.basketLineMeta}>{item.product && item.status === "buy" ? `${item.packCount} × ${displayPack(item.product.packSize, item.product.unit)} · ${item.product.brand}` : item.status === "covered" ? "Already in your kitchen" : "No product available for this ingredient"}</span>
      <details className={styles.lineDetails}><summary>Quantity details</summary><p>Need {formatQuantity(item.required, item.unit)} · have {formatQuantity(item.owned, item.unit)} · missing {formatQuantity(item.missing, item.unit)}</p>{item.product ? <p>{item.product.name}</p> : null}</details>
    </li>
  );
}

export function BasketPanel({ basket, toBuyCount }: { basket: Basket; toBuyCount: number }) {
  const buy = basket.items.filter((item) => item.status === "buy");
  const covered = basket.items.filter((item) => item.status === "covered");
  const unavailable = basket.items.filter((item) => item.status === "unavailable");

  return (
    <section className={styles.basketSummary} aria-label="Pantry-aware basket" id="weekly-basket" tabIndex={-1}>
      <div className={styles.basketEyebrow}><ShoppingBag size={18} aria-hidden /><span>Just what’s missing</span></div>
      <h3>Your basket</h3>
      <p className={styles.basketPrice}>{formatRupees(basket.totalCost)}</p>
      <p className={styles.panelHint}>{toBuyCount} ingredients to buy · estimated</p>
      <p className={styles.pantryCredit}><Check size={15} aria-hidden /> {formatRupees(basket.pantryValueAvoided)} of required quantities already home</p>
      {unavailable.length > 0 ? <p className={styles.unavailableNote}>{unavailable.length} ingredient{unavailable.length === 1 ? "" : "s"} unavailable. This basket cannot cover the full plan.</p> : null}
      {basket.items.length === 0 ? <p className={styles.panelHint}>Choose a meal to start your shopping list.</p> : (
        <details className={styles.basketDisclosure}>
          <summary>Review basket <span aria-hidden>↗</span></summary>
          <div className={styles.basketContents}>
            {buy.length > 0 ? <><h4>To buy · {buy.length}</h4><ul className={styles.basketMobileList}>{buy.map((item) => <BasketLine key={item.ingredientId} item={item} />)}</ul></> : null}
            {unavailable.length > 0 ? <><h4>Unavailable · {unavailable.length}</h4><ul className={styles.basketMobileList}>{unavailable.map((item) => <BasketLine key={item.ingredientId} item={item} />)}</ul></> : null}
            {covered.length > 0 ? <details className="disclosure"><summary>{covered.length} ingredients fully covered at home</summary><ul className={styles.basketMobileList}>{covered.map((item) => <BasketLine key={item.ingredientId} item={item} />)}</ul></details> : null}
            <p className="small muted">Prices include whole packs. Pantry value reflects the quantities you already own, so it is not a checkout discount.</p>
          </div>
        </details>
      )}
      <p className={styles.basketFootnote}>Prototype estimate. Nothing is ordered.</p>
    </section>
  );
}

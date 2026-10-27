"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { recipeById } from "@/catalog/grocery-graph";
import type { KitchenCommand } from "@/domain/kitchen/commands";
import { formatQuantity, formatRupees, normalizeQuantity } from "@/domain/units";
import { dishName, ingredientTone } from "@/components/app/food";
import { useKitchen } from "@/components/app/use-kitchen";
import { ErrorNote, Loading } from "@/components/app/ui";
import styles from "@/components/app/app.module.css";

/**
 * Prototype checkout. Plain on purpose: every line shows the pack, the
 * quantity, the price and the meals it is for. Placing the order records the
 * groceries as received; nothing is bought.
 */
export function Checkout() {
  const session = useKitchen();
  const router = useRouter();
  const [showHome, setShowHome] = useState(false);

  if (session.status !== "ready") return <Loading />;
  const { catalog, intelligence, run, error } = session;
  const { basket } = intelligence;
  const buy = basket.items.filter((item) => item.status === "buy");
  const unavailable = basket.items.filter((item) => item.status === "unavailable");
  const covered = basket.items.filter((item) => item.status === "covered");

  const mealNames = (ids: string[]) =>
    ids.flatMap((id) => { const name = recipeById(catalog, id)?.name;

 return name ? [dishName(name)] : []; }).join(", ");

  const placeOrder = () => {
    const commands: KitchenCommand[] = [];

    if (intelligence.planSource === "suggested" && intelligence.plan.length > 0) {
      commands.push({
        type: "select_meals",
        meals: intelligence.plan.map(({ day, slot, recipeId }) => ({ day, slot, recipeId })),
      });
    }

    const lines = buy
      .filter((item) => item.purchasedQuantity > 0)
      .map((item) => ({ ingredientId: item.ingredientId, quantity: item.purchasedQuantity, unit: item.unit }));

    if (lines.length > 0) commands.push({ type: "receive_grocery", lines });

    if (run(commands)) router.push("/");
  };

  return (
    <div className={`${styles.screen} ${styles.paper}`}>
      <header className={styles.topBar}>
        <Link href="/week" className={styles.iconLink} aria-label="Back to your week">
          <ArrowLeft size={22} aria-hidden />
        </Link>
        <h1 className={styles.title}>Your basket</h1>
        <span className={styles.counter}>{buy.length} items</span>
      </header>

      {covered.length > 0 ? (
        <section className={styles.homeBanner}>
          <div className={styles.homeBannerRow}>
            <Check size={18} strokeWidth={3} aria-hidden />
            <p>
              <strong>{covered.length} items already home</strong>
              <span> · not in the basket · worth {formatRupees(basket.pantryValueAvoided)}</span>
            </p>
            <button type="button" aria-expanded={showHome} onClick={() => setShowHome((open) => !open)}>
              {showHome ? "Hide" : "See"}
            </button>
          </div>
          {showHome ? (
            <p className={styles.homeList}>{covered.map((item) => item.ingredient.name).join(", ")}</p>
          ) : null}
        </section>
      ) : null}

      <ul className={styles.lineList}>
        {buy.map((item) => {
          const pack = item.product ? normalizeQuantity(item.product.packSize, item.product.unit) : null;

          return (
            <li key={item.ingredientId} className={styles.line}>
              <span className={styles.lineSwatch} style={{ background: ingredientTone(item.ingredient) }} aria-hidden />
              <div className={styles.lineBody}>
                <p className={styles.lineName}>{item.product?.name ?? item.ingredient.name}</p>
                <p className={styles.lineMeta}>
                  {pack ? `${formatQuantity(pack.quantity, pack.unit)} pack` : ""}
                  {item.usedInRecipeIds.length > 0 ? ` · for ${mealNames(item.usedInRecipeIds)}` : ""}
                </p>
              </div>
              <span className={styles.lineQty}>×{item.packCount}</span>
              <span className={styles.linePrice}>{formatRupees(item.lineCost)}</span>
            </li>
          );
        })}
        {unavailable.map((item) => (
          <li key={item.ingredientId} className={`${styles.line} ${styles.lineMuted}`}>
            <span className={styles.lineSwatch} style={{ background: ingredientTone(item.ingredient) }} aria-hidden />
            <div className={styles.lineBody}>
              <p className={styles.lineName}>{item.ingredient.name}</p>
              <p className={styles.lineMeta}>Not available nearby</p>
            </div>
          </li>
        ))}
      </ul>

      <dl className={styles.totals}>
        <div><dt>Items</dt><dd>{formatRupees(basket.totalCost)}</dd></div>
        <div><dt>Delivery</dt><dd>Not charged</dd></div>
        <div className={styles.totalRow}><dt>To pay</dt><dd>{formatRupees(basket.totalCost)}</dd></div>
      </dl>

      <ErrorNote message={error} />

      <div className={styles.footer}>
        <p className={styles.hint}>Prototype checkout with simulated prices. Nothing is ordered.</p>
        <button type="button" className={styles.primary} onClick={placeOrder} disabled={buy.length === 0}>
          {buy.length === 0 ? "Everything's at home" : `Place order · ${formatRupees(basket.totalCost)}`}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ingredientById } from "@/catalog/grocery-graph";
import type { Catalog } from "@/catalog/types";
import type { KitchenState } from "@/domain/kitchen/types";
import type { Unit } from "@/domain/units";
import { displayQuantity } from "@/components/kitchen/format";
import styles from "@/components/kitchen/kitchen.module.css";

/**
 * Record what actually happened in the kitchen: quantities used or wasted.
 * These become consumption facts; invalid records are rejected by the domain.
 */
export function UsageRecorder({
  kitchen,
  catalog,
  onRecord,
}: {
  kitchen: KitchenState;
  catalog: Catalog;
  onRecord: (kind: "used" | "wasted", ingredientId: string, quantity: number, unit: Unit) => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const rows = [...kitchen.pantry].sort((a, b) =>
    (ingredientById(catalog, a.ingredientId)?.name ?? a.ingredientId).localeCompare(
      ingredientById(catalog, b.ingredientId)?.name ?? b.ingredientId,
    ),
  );

  return (
    <section className={styles.panel} aria-label="Record pantry use">
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Record what happened</h3>
        <p className={styles.panelHint}>
          Manual entries for real cooking — these facts drive replenishment and waste signals
        </p>
      </div>
      {rows.length === 0 ? (
        <p className={styles.emptyState}>
          The pantry is empty. Receive a basket or wait for the next week to build stock.
        </p>
      ) : (
        <ul className={styles.usageList}>
          {rows.map((item) => {
            const ingredient = ingredientById(catalog, item.ingredientId);
            const quantityValue = quantities[item.ingredientId] ?? "";
            const parsed = Number(quantityValue);
            const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= item.quantity;
            const setValue = (value: string) =>
              setQuantities((current) => ({ ...current, [item.ingredientId]: value }));
            const record = (kind: "used" | "wasted") => {
              if (!valid) return;
              onRecord(kind, item.ingredientId, parsed, item.unit);
              setValue("");
            };
            return (
              <li key={item.ingredientId} className={styles.usageRow}>
                <span className={styles.usageName}>
                  <strong>{ingredient?.name ?? item.ingredientId}</strong>
                  <span className="small muted">
                    {" "}
                    · {displayQuantity(item.quantity, item.unit)} in pantry
                  </span>
                </span>
                <span className={styles.usageControls}>
                  <label className="sr-only" htmlFor={`use-${item.ingredientId}`}>
                    Quantity of {ingredient?.name ?? item.ingredientId} to record ({item.unit})
                  </label>
                  <input
                    id={`use-${item.ingredientId}`}
                    type="number"
                    min={0}
                    max={item.quantity}
                    step={10}
                    value={quantityValue}
                    placeholder={String(item.quantity)}
                    onChange={(event) => setValue(event.target.value)}
                    className={styles.usageInput}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    disabled={!valid}
                    onClick={() => record("used")}
                  >
                    Used
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    disabled={!valid}
                    onClick={() => record("wasted")}
                  >
                    Wasted
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

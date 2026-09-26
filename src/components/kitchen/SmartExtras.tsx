import type { ReactNode } from "react";
import styles from "@/components/kitchen/kitchen.module.css";

/**
 * One home for the three smaller household moves — rescue, swap, restock —
 * so they do not compete with the plan and the basket for attention. Each
 * child keeps its own accessible region inside this group.
 */
export function SmartExtras({ children, count }: { children: ReactNode; count: number }) {
  return (
    <section className={styles.panel} aria-label="Smart extras">
      <div className={styles.panelHeader}>
        <div>
          <h3 className={styles.panelTitle}>Smart extras</h3>
          <p className={styles.panelHint}>
            {count > 0 ? `${count} optional move${count === 1 ? "" : "s"} this week` : "Nothing extra this week"}
          </p>
        </div>
      </div>
      <div className={styles.extrasStack}>{children}</div>
    </section>
  );
}

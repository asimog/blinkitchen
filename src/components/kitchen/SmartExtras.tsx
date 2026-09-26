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
      <details><summary className={styles.pantrySummary}>Make a little more of your groceries <span>{count} ideas · reuse, swap & restock</span></summary>
      <div className={styles.extrasStack}>{children}</div>
      </details>
    </section>
  );
}

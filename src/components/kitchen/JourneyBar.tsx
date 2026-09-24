import type { ReactNode } from "react";
import styles from "@/components/kitchen/kitchen.module.css";

/**
 * Sticky command bar for the journey surfaces. Keeps the household context,
 * week navigation and primary actions visible while the week content scrolls.
 */
export function JourneyBar({
  title,
  context,
  rail,
  actions,
}: {
  title: string;
  context?: string;
  rail?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.journeyBar}>
      <div className={styles.journeyBarIdentity}>
        <span className={styles.journeyBarName}>{title}</span>
        {context ? <span className={styles.journeyBarContext}>{context}</span> : null}
      </div>
      {rail ? <div className={styles.journeyBarRail}>{rail}</div> : null}
      {actions ? <div className={styles.journeyBarActions}>{actions}</div> : null}
    </div>
  );
}
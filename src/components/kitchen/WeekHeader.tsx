import type { ReactNode } from "react";
import { WEEK_MAX } from "@/domain/kitchen/types";
import styles from "@/components/kitchen/kitchen.module.css";

export function WeekHeader({
  week,
  householdName,
  badges,
  actions,
}: {
  week: number;
  householdName: string;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.weekHeader}>
      <div>
        <p className="eyebrow">Week {week} of {WEEK_MAX}</p>
        <h2 className={styles.weekTitle}>{householdName}</h2>
        {badges ? <div className={styles.weekMeta}>{badges}</div> : null}
        <div className={styles.pips} role="img" aria-label={`Week ${week} of ${WEEK_MAX}`}>
          {Array.from({ length: WEEK_MAX }, (_, index) => {
            const weekNumber = index + 1;
            const className =
              weekNumber < week
                ? `${styles.pip} ${styles.pipDone}`
                : weekNumber === week
                  ? `${styles.pip} ${styles.pipActive}`
                  : styles.pip;
            return <span key={weekNumber} className={className} />;
          })}
        </div>
      </div>
      {actions ? <div className={styles.controls}>{actions}</div> : null}
    </header>
  );
}

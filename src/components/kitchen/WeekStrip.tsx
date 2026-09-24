import { WEEK_MAX } from "@/domain/kitchen/types";
import styles from "@/components/kitchen/kitchen.module.css";

/** Non-interactive progress strip for the household's own linear journey. */
export function WeekStrip({ week }: { week: number }) {
  return (
    <div className={styles.weekStrip} role="img" aria-label={`Week ${week} of ${WEEK_MAX}`}>
      {Array.from({ length: WEEK_MAX }, (_, index) => {
        const weekNumber = index + 1;

        const className =
          weekNumber < week
            ? `${styles.weekStripSegment} ${styles.weekStripDone}`
            : weekNumber === week
              ? `${styles.weekStripSegment} ${styles.weekStripActive}`
              : styles.weekStripSegment;

        return <span key={weekNumber} className={className} />;
      })}
    </div>
  );
}
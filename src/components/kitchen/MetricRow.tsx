import { formatRupees } from "@/domain/units";
import type { WeekIntelligence } from "@/intelligence";
import styles from "@/components/kitchen/kitchen.module.css";

export function MetricRow({ intelligence }: { intelligence: WeekIntelligence }) {
  const toBuy = intelligence.basket.items.filter((item) => item.status === "buy").length;
  const useSoonCount = intelligence.useSoon.length;

  return (
    <div className={styles.metrics}>
      <div className={styles.metric}>
        <p className={styles.metricLabel}>Pantry coverage</p>
        <p className={styles.metricValue}>{Math.round(intelligence.coverage.percent)}%</p>
        <p className={styles.metricHint}>
          of this plan&apos;s value is already home
        </p>
      </div>
      <div className={`${styles.metric} ${styles.metricAccent}`}>
        <p className={styles.metricLabel}>Simulated basket</p>
        <p className={styles.metricValue}>{formatRupees(intelligence.basket.totalCost)}</p>
        <p className={styles.metricHint}>estimated, nothing is ordered</p>
      </div>
      <div className={styles.metric}>
        <p className={styles.metricLabel}>Ingredients to buy</p>
        <p className={styles.metricValue}>{toBuy}</p>
        <p className={styles.metricHint}>
          {intelligence.basket.items.length - toBuy} already covered
        </p>
      </div>
      <div className={styles.metric}>
        <p className={styles.metricLabel}>Use soon</p>
        <p className={styles.metricValue}>{useSoonCount}</p>
        <p className={styles.metricHint}>
          {useSoonCount === 0 ? "nothing at risk this week" : "items worth cooking first"}
        </p>
      </div>
    </div>
  );
}

import styles from "@/components/kitchen/kitchen.module.css";

/**
 * One metric tile. Rendered inside a <dl>, so label/value/hint keep their
 * definition-list semantics for assistive technology.
 */
export function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className={`${styles.metric} ${accent ? styles.metricAccent : ""}`}>
      <dt className={styles.metricLabel}>{label}</dt>
      <dd className={styles.metricValue}>{value}</dd>
      <dd className={styles.metricHint}>{hint}</dd>
    </div>
  );
}

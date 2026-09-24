import type { ReactNode } from "react";
import { WEEK_MAX } from "@/domain/kitchen/types";
import styles from "@/components/kitchen/kitchen.module.css";

/** Household identity for the displayed week. Navigation lives in the journey bar. */
export function WeekHeader({
  week,
  householdName,
  badges,
}: {
  week: number;
  householdName: string;
  badges?: ReactNode;
}) {
  return (
    <header className={styles.weekHeader}>
      <p className="eyebrow" style={{ marginBottom: "0.35rem" }}>
        Week {week} of {WEEK_MAX}
      </p>
      <h2 className={styles.weekTitle}>{householdName}</h2>
      {badges ? <div className={styles.weekMeta}>{badges}</div> : null}
    </header>
  );
}
"use client";

import { WEEK_MAX } from "@/domain/kitchen/types";
import styles from "@/components/kitchen/kitchen.module.css";

/** Segmented week selector for replay surfaces. */
export function WeekRail({
  week,
  onSelect,
}: {
  week: number;
  onSelect: (week: number) => void;
}) {
  return (
    <div className={styles.weekRail} role="group" aria-label="Jump to week">
      {Array.from({ length: WEEK_MAX }, (_, index) => index + 1).map((candidate) => {
        const active = candidate === week;

        return (
          <button
            key={candidate}
            type="button"
            className={
              active
                ? `${styles.weekRailItem} ${styles.weekRailItemActive}`
                : `${styles.weekRailItem} ${candidate < week ? styles.weekRailItemDone : ""}`
            }
            aria-current={active ? "step" : undefined}
            onClick={() => onSelect(candidate)}
          >
            W{candidate}
          </button>
        );
      })}
    </div>
  );
}
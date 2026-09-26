"use client";

import { useMemo } from "react";
import { loadCatalog } from "@/catalog/load";
import { compareJourney } from "@/intelligence/journey";
import type { KitchenState } from "@/domain/kitchen/types";
import styles from "@/components/explore/explore.module.css";

/**
 * One screen that answers the longitudinal question: what did the system know
 * at Week 1, and what did eight weeks of recorded facts change? Derived from
 * the replayed states on every render; nothing is stored.
 */
export function JourneyComparisonPanel({ states }: { states: KitchenState[] }) {
  const catalog = useMemo(() => loadCatalog(), []);

  const comparison = useMemo(
    () => (states.length > 1 ? compareJourney(states, catalog) : null),
    [states, catalog],
  );

  if (!comparison) {
    return (
      <section id="journey-comparison" className={styles.comparison} aria-label="Journey comparison">
        <h2 className={styles.comparisonTitle}>Your kitchen, over time</h2>
        <p className="small muted">
          Advance a week to see what your kitchen learns.
        </p>
      </section>
    );
  }

  const lastWeek = states.at(-1)?.week ?? 1;

  return (
    <section id="journey-comparison" className={styles.comparison} aria-label="Journey comparison">
      <div className={styles.comparisonHeader}>
        <div>
          <h2 className={styles.comparisonTitle}>Week 1 &rarr; Week {lastWeek}</h2>
          <p className="small muted">
            {comparison.householdName} · comparing {comparison.weeksObserved} weekly snapshots
          </p>
        </div>
      </div>

      <details className="disclosure"><summary>Compare the details</summary>
      <table className={styles.comparisonTable}>
        <thead>
          <tr>
            <th scope="col">Signal</th>
            <th scope="col">Week 1</th>
            <th scope="col">Week {lastWeek}</th>
          </tr>
        </thead>
        <tbody>
          {comparison.metrics.map((metric) => (
            <tr key={metric.id}>
              <th scope="row">
                {metric.label}

              </th>
              <td>{metric.week1}</td>
              <td className={metric.direction === "up" && metric.id !== "waste" ? styles.comparisonUp : undefined}>
                {metric.week8}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </details>

      <div className={styles.comparisonHighlights}>
        <div>
          <h3 className={styles.comparisonSubtitle}>What the system knew</h3>
          <ul>
            {comparison.week1Highlights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className={styles.comparisonSubtitle}>What it learned</h3>
          <ul>
            {comparison.week8Highlights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

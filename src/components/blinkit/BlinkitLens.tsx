"use client";

import { useMemo } from "react";
import Link from "next/link";
import { loadCatalog } from "@/catalog/load";
import { formatRupees } from "@/domain/units";
import type { KitchenState } from "@/domain/kitchen/types";
import { humanizeId } from "@/intelligence";
import { buildBlinkitInsights } from "@/insights/blinkit";
import { buildFixtureKitchen, HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import { householdPolicy } from "@/simulation/policies";
import { simulateJourney } from "@/simulation/simulate";
import kitchenStyles from "@/components/kitchen/kitchen.module.css";
import styles from "@/components/blinkit/blinkit.module.css";

/**
 * The Blinkit lens: cohort intelligence over the four simulated households.
 * A read-only projection — every number is derived on render and labelled.
 */
export function BlinkitLens() {
  const catalog = useMemo(() => loadCatalog(), []);
  const insights = useMemo(() => {
    const states: KitchenState[] = [];
    for (const fixture of HOUSEHOLD_FIXTURES) {
      states.push(...simulateJourney(buildFixtureKitchen(fixture), catalog, householdPolicy));
    }
    return buildBlinkitInsights(states, catalog);
  }, [catalog]);

  const maxMissing = Math.max(1, ...insights.missingIngredients.map((row) => row.weeksMissing));
  const maxReuse = Math.max(1, ...insights.reusedIngredients.map((row) => row.appearances));
  const maxUseSoon = Math.max(1, ...insights.useSoonFrequency.map((row) => row.occurrences));
  const maxCuisine = Math.max(1, ...insights.cuisineSignals.map((row) => row.meals));

  const archetypeOf = (householdId: string): string =>
    HOUSEHOLD_FIXTURES.find((fixture) => `sim-${fixture.id}` === householdId)?.archetype ??
    householdId;

  return (
    <div className="container">
      <section className={styles.intro}>
        <p className="eyebrow">Blinkit lens · weeks 1–8 · simulated</p>
        <h1>What the cohort signal looks like</h1>
        <p className="muted" style={{ maxWidth: "62ch" }}>
          Four deterministic household fixtures, replayed through the same engine. This is a
          product-strategy view of household intelligence — not an operations dashboard, and not
          real Blinkit data.
        </p>
      </section>

      <p className={styles.simulatedBanner} role="note">
        SIMULATED DATA — four fixtures, not real Blinkit users, demand or inventory. Nothing here
        is an order, a forecast or a business fact.
      </p>

      <div className={kitchenStyles.metrics}>
        <div className={kitchenStyles.metric}>
          <p className={kitchenStyles.metricLabel}>Simulated households</p>
          <p className={kitchenStyles.metricValue}>{insights.households}</p>
          <p className={kitchenStyles.metricHint}>four archetypes, one engine</p>
        </div>
        <div className={kitchenStyles.metric}>
          <p className={kitchenStyles.metricLabel}>Household-weeks</p>
          <p className={kitchenStyles.metricValue}>{insights.weekSnapshots}</p>
          <p className={kitchenStyles.metricHint}>weeks 1–8 per household</p>
        </div>
        <div className={kitchenStyles.metric}>
          <p className={kitchenStyles.metricLabel}>Cumulative simulated basket</p>
          <p className={kitchenStyles.metricValue}>{formatRupees(insights.cumulativeBasketSpend)}</p>
          <p className={kitchenStyles.metricHint}>at fictional catalog prices</p>
        </div>
        <div className={`${kitchenStyles.metric} ${kitchenStyles.metricAccent}`}>
          <p className={kitchenStyles.metricLabel}>Demand avoided by pantry</p>
          <p className={kitchenStyles.metricValue}>{formatRupees(insights.avoidedBasketValue)}</p>
          <p className={kitchenStyles.metricHint}>needed on paper, already home</p>
        </div>
      </div>

      <section className={kitchenStyles.panel} aria-label="Archetype comparison">
        <div className={kitchenStyles.panelHeader}>
          <h2 className={kitchenStyles.panelTitle}>How the archetypes behave differently</h2>
          <p className={kitchenStyles.panelHint}>Same engine, different inputs</p>
        </div>
        <div className={kitchenStyles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Household</th>
                <th scope="col">Meals cooked</th>
                <th scope="col">Basket spend</th>
                <th scope="col">Final coverage</th>
                <th scope="col">Swaps ✓ / ✗</th>
                <th scope="col">Spoilage</th>
                <th scope="col">Reuse chains</th>
                <th scope="col">Avg prep</th>
              </tr>
            </thead>
            <tbody>
              {insights.archetypes.map((row) => (
                <tr key={row.householdId}>
                  <td>
                    <strong>{row.householdName}</strong>
                    <div className="small muted">{archetypeOf(row.householdId)}</div>
                  </td>
                  <td className={styles.numeric}>{row.mealsCooked}</td>
                  <td className={styles.numeric}>{formatRupees(row.basketSpend)}</td>
                  <td className={styles.numeric}>{Math.round(row.finalCoveragePercent)}%</td>
                  <td className={styles.numeric}>
                    {row.acceptedSwaps} / {row.rejectedSwaps}
                  </td>
                  <td className={styles.numeric}>{row.spoilageEvents}</td>
                  <td className={styles.numeric}>{row.reuseChains}</td>
                  <td className={styles.numeric}>{row.avgPreparationMinutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={kitchenStyles.panel} aria-label="Ingredients repeatedly missing">
          <div className={kitchenStyles.panelHeader}>
            <h2 className={kitchenStyles.panelTitle}>Recurring gaps</h2>
            <p className={kitchenStyles.panelHint}>missing in the most household-weeks</p>
          </div>
          {insights.missingIngredients.map((row) => (
            <div key={row.ingredientId} className={kitchenStyles.signalRow}>
              <span className={kitchenStyles.signalLabel}>{row.name}</span>
              <div className={kitchenStyles.barTrack} aria-hidden>
                <div
                  className={kitchenStyles.barFill}
                  style={{ width: `${Math.round((row.weeksMissing / maxMissing) * 100)}%` }}
                />
              </div>
              <span className={kitchenStyles.signalValue}>{row.share}%</span>
            </div>
          ))}
        </section>

        <section className={kitchenStyles.panel} aria-label="Ingredients heavily reused">
          <div className={kitchenStyles.panelHeader}>
            <h2 className={kitchenStyles.panelTitle}>Reuse engine</h2>
            <p className={kitchenStyles.panelHint}>
              fresh and protein ingredients by meal appearances in shared plans
            </p>
          </div>
          {insights.reusedIngredients.map((row) => (
            <div key={row.ingredientId} className={kitchenStyles.signalRow}>
              <span className={kitchenStyles.signalLabel}>{row.name}</span>
              <div className={kitchenStyles.barTrack} aria-hidden>
                <div
                  className={kitchenStyles.barFill}
                  style={{ width: `${Math.round((row.appearances / maxReuse) * 100)}%` }}
                />
              </div>
              <span className={kitchenStyles.signalValue}>{row.appearances}</span>
            </div>
          ))}
        </section>

        <section className={kitchenStyles.panel} aria-label="Use-soon pressure">
          <div className={kitchenStyles.panelHeader}>
            <h2 className={kitchenStyles.panelTitle}>Use-soon pressure</h2>
            <p className={kitchenStyles.panelHint}>weeks an ingredient sat at risk</p>
          </div>
          {insights.useSoonFrequency.length === 0 ? (
            <p className={kitchenStyles.emptyState}>No use-soon pressure recorded.</p>
          ) : (
            insights.useSoonFrequency.map((row) => (
              <div key={row.ingredientId} className={kitchenStyles.signalRow}>
                <span className={kitchenStyles.signalLabel}>{row.name}</span>
                <div className={kitchenStyles.barTrack} aria-hidden>
                  <div
                    className={kitchenStyles.barFill}
                    style={{ width: `${Math.round((row.occurrences / maxUseSoon) * 100)}%` }}
                  />
                </div>
                <span className={kitchenStyles.signalValue}>{row.occurrences}</span>
              </div>
            ))
          )}
        </section>

        <section className={kitchenStyles.panel} aria-label="Replenishment signals">
          <div className={kitchenStyles.panelHeader}>
            <h2 className={kitchenStyles.panelTitle}>Replenishment signals</h2>
            <p className={kitchenStyles.panelHint}>households where the ingredient ran low</p>
          </div>
          {insights.replenishmentSignals.length === 0 ? (
            <p className={kitchenStyles.emptyState}>
              No recurring replenishment signal crossed the threshold in this cohort.
            </p>
          ) : (
            <ul className={styles.tagList}>
              {insights.replenishmentSignals.map((row) => (
                <li key={row.ingredientId} className="pill pill-warning">
                  {row.name} · {row.households}{" "}
                  {row.households === 1 ? "household" : "households"}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={kitchenStyles.panel} aria-label="Substitution outcomes">
          <div className={kitchenStyles.panelHeader}>
            <h2 className={kitchenStyles.panelTitle}>Swap outcomes</h2>
            <p className={kitchenStyles.panelHint}>accepted shapes the next suggestion</p>
          </div>
          <div className={kitchenStyles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Swap</th>
                  <th scope="col">Accepted</th>
                  <th scope="col">Rejected</th>
                </tr>
              </thead>
              <tbody>
                {insights.substitutionOutcomes.map((row) => (
                  <tr key={row.substitutionId}>
                    <td>{row.label}</td>
                    <td className={styles.numeric}>{row.accepted}</td>
                    <td className={styles.numeric}>{row.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={kitchenStyles.panel} aria-label="Cuisine signals">
          <div className={kitchenStyles.panelHeader}>
            <h2 className={kitchenStyles.panelTitle}>Cuisine signals</h2>
            <p className={kitchenStyles.panelHint}>meals cooked across the cohort</p>
          </div>
          {insights.cuisineSignals.map((row) => (
            <div key={row.cuisine} className={kitchenStyles.signalRow}>
              <span className={kitchenStyles.signalLabel}>{humanizeId(row.cuisine)}</span>
              <div className={kitchenStyles.barTrack} aria-hidden>
                <div
                  className={kitchenStyles.barFill}
                  style={{ width: `${Math.round((row.meals / maxCuisine) * 100)}%` }}
                />
              </div>
              <span className={kitchenStyles.signalValue}>{row.meals}</span>
            </div>
          ))}
        </section>
      </div>

      <section className={kitchenStyles.panel} aria-label="Strategic read-out">
        <div className={kitchenStyles.panelHeader}>
          <h2 className={kitchenStyles.panelTitle}>Strategic read-out</h2>
          <p className={kitchenStyles.panelHint}>plain language, simulated source</p>
        </div>
        <ul className={kitchenStyles.narrativeList}>
          {insights.narrative.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="small muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
          Reading: pantry awareness changes basket composition more than it changes intent;
          substitution memory is cheap to earn and cheap to lose; use-soon pressure concentrates in
          perishables bought in packs larger than the week&apos;s need.{" "}
          <Link href="/explore">Replay a household</Link> to inspect any claim.
        </p>
      </section>
    </div>
  );
}

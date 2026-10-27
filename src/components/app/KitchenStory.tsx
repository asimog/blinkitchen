"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Catalog } from "@/catalog/types";
import { isJourneyComplete } from "@/domain/kitchen/state";
import { WEEK_MAX } from "@/domain/kitchen/types";
import type { KitchenState } from "@/domain/kitchen/types";
import { formatRupees } from "@/domain/units";
import { buildBlinkitInsights } from "@/insights/blinkit";
import { householdWeeks, kitchenLearned } from "@/intelligence/journey";
import { buildPantryTimeline } from "@/intelligence/pantry-timeline";
import { buildFixtureKitchen, HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import { householdPolicy } from "@/simulation/policies";
import { simulateJourney, simulateWeek } from "@/simulation/simulate";
import { clearKitchen } from "@/storage/kitchen-storage";
import { STARTER_NAME } from "@/components/app/starter-kitchen";
import { DAY_SHORT, useKitchen } from "@/components/app/use-kitchen";
import type { ReadyKitchen } from "@/components/app/use-kitchen";
import { BottomNav, Loading } from "@/components/app/ui";
import styles from "@/components/app/app.module.css";

/**
 * Weeks still ahead, played out by the same policy and engine the simulated
 * households use, starting from this household's real facts. Never saved.
 */
function projectAhead(kitchen: KitchenState, catalog: Catalog): KitchenState[] {
  if (isJourneyComplete(kitchen)) return [kitchen];
  const states = simulateJourney(kitchen, catalog, householdPolicy);
  const last = states.at(-1);

  if (!last || isJourneyComplete(last)) return states;
  const closed = simulateWeek(last, catalog, householdPolicy);

  return closed.ok ? [...states, closed.state] : states;
}

let cohortCache: ReturnType<typeof buildBlinkitInsights> | null = null;

function cohortInsights(catalog: Catalog) {
  if (!cohortCache) {
    const states = HOUSEHOLD_FIXTURES.flatMap((fixture) =>
      simulateJourney(buildFixtureKitchen(fixture), catalog, householdPolicy),
    );

    cohortCache = buildBlinkitInsights(states, catalog);
  }

  return cohortCache;
}

export function KitchenStory() {
  const session = useKitchen();

  if (session.status !== "ready") return <Loading />;

  return <KitchenView session={session} />;
}

function KitchenView({ session }: { session: ReadyKitchen }) {
  const { catalog, kitchen, intelligence } = session;
  const router = useRouter();
  const [lens, setLens] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const projection = useMemo(() => projectAhead(kitchen, catalog), [kitchen, catalog]);
  const realWeeks = householdWeeks(kitchen, catalog);
  const lastReal = realWeeks.at(-1)?.week ?? 0;
  const final = projection.at(-1) ?? kitchen;
  const weeks = householdWeeks(final, catalog);
  const first = weeks[0];
  const latest = weeks.at(-1);
  const learned = kitchenLearned(kitchen, catalog, intelligence.learning);
  const saved = weeks.reduce((total, week) => total + week.notRebought, 0);
  const tallest = Math.max(1, ...weeks.map((week) => week.homeSharePercent));

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);

      return;
    }

    clearKitchen();
    router.push("/start");
  };

  return (
    <div className={`${styles.screen} ${lens ? styles.night : styles.paper}`}>
      <header className={styles.topBar}>
        <h1 className={styles.title}>{kitchen.profile.displayName}</h1>
        <div className={styles.segment} role="group" aria-label="View">
          <button type="button" aria-pressed={!lens} onClick={() => setLens(false)}>Journey</button>
          <button type="button" aria-pressed={lens} onClick={() => setLens(true)}>Blinkit lens</button>
        </div>
      </header>

      {lens ? (
        <Lens kitchen={kitchen} catalog={catalog} session={session} future={projection.slice(1)} />
      ) : (
        <>
          <section className={styles.bigStat}>
            <p className={styles.bigNumber}>
              {first ? `${first.homeSharePercent}%` : "–"}
              <span className={styles.arrow}> → </span>
              {latest ? `${latest.homeSharePercent}%` : "–"}
            </p>
            <p className={styles.bigCaption}>of what you cooked was already at home</p>
          </section>

          <div className={styles.bars} role="img" aria-label="Share cooked from home, week by week">
            {Array.from({ length: WEEK_MAX }, (_, index) => {
              const week = weeks[index];
              const projected = !week || week.week > lastReal;

              return (
                <div key={index} className={styles.barCol}>
                  <span
                    className={styles.bar}
                    data-projected={projected || undefined}
                    data-current={index + 1 === kitchen.week || undefined}
                    style={{ height: `${Math.max(6, ((week?.homeSharePercent ?? 0) / tallest) * 100)}%` }}
                  />
                  <span className={styles.barLabel}>{index + 1}</span>
                </div>
              );
            })}
          </div>
          <p className={styles.legend}>
            {lastReal === 0
              ? "Every week here is projected from your choices so far."
              : lastReal < WEEK_MAX
                ? `Weeks ${lastReal + 1}–${WEEK_MAX} are projected from how you cook.`
                : "All eight weeks are yours."}
          </p>

          <div className={styles.statPair}>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{first?.wastedItems ?? 0} → {latest?.wastedItems ?? 0}</p>
              <p className={styles.statLabel}>items thrown away</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{formatRupees(saved)}</p>
              <p className={styles.statLabel}>not bought again</p>
            </div>
          </div>

          <section className={styles.learned}>
            <h2 className={styles.learnedLabel}>YOUR KITCHEN LEARNED</h2>
            {learned.length > 0 ? (
              <ul>
                {learned.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>Cook through a week and this fills in.</p>
            )}
          </section>

          <div className={styles.footerInline}>
            <button type="button" className={styles.quiet} onClick={reset} onBlur={() => setConfirmReset(false)}>
              {confirmReset ? "Tap again to erase this kitchen" : "Start over"}
            </button>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}

function Lens({
  kitchen,
  catalog,
  session,
  future,
}: {
  kitchen: KitchenState;
  catalog: Catalog;
  session: ReadyKitchen;
  future: KitchenState[];
}) {
  const ahead = useMemo(() => buildBlinkitInsights(future, catalog), [future, catalog]);
  const cohort = useMemo(() => cohortInsights(catalog), [catalog]);

  const thisWeek = buildPantryTimeline(kitchen, catalog, session.intelligence).events.filter(
    (event) => event.kind === "runs_out" || event.kind === "running_low",
  );

  const needs = ahead.missingIngredients.slice(0, 4);

  return (
    <>
      <h2 className={styles.lensTitle}>
        {kitchen.profile.displayName === STARTER_NAME
          ? "What you will need next, before you search"
          : `What ${kitchen.profile.displayName} will need next, before they search`}
      </h2>

      {thisWeek.length > 0 ? (
        <ul className={styles.needList} aria-label="This week">
          {thisWeek.slice(0, 2).map((event) => (
            <li key={event.ingredient.id} className={styles.need}>
              <span className={styles.needName}>{event.ingredient.name}</span>
              <span className={styles.needWhen}>{event.kind === "runs_out" ? DAY_SHORT[event.day] : "Soon"}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {needs.length > 0 ? (
        <ul className={styles.needList} aria-label="Coming weeks">
          {needs.map((row) => (
            <li key={row.ingredientId} className={styles.need}>
              <span className={styles.needName}>{row.name}</span>
              <span className={styles.needWhen}>
                {row.weeksMissing} of {ahead.weekSnapshots} weeks
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.lensNote}>Plan a week and the forecast appears.</p>
      )}

      <h3 className={styles.sectionLabelLight}>KITCHENS LIKE THIS</h3>
      <div className={styles.lensBars}>
        {cohort.missingIngredients.slice(0, 3).map((row) => (
          <div key={row.ingredientId}>
            <p className={styles.lensBarRow}>
              <span>{row.name} bought most weeks</span>
              <strong>{row.share}%</strong>
            </p>
            <span className={styles.lensTrack}>
              <span style={{ width: `${row.share}%` }} />
            </span>
          </div>
        ))}
        {cohort.substitutionOutcomes.slice(0, 1).map((row) => {
          const total = row.accepted + row.rejected;
          const share = total > 0 ? Math.round((row.accepted / total) * 100) : 0;

          return (
            <div key={row.substitutionId}>
              <p className={styles.lensBarRow}>
                <span>Accept {row.label}</span>
                <strong>{share}%</strong>
              </p>
              <span className={styles.lensTrack}>
                <span style={{ width: `${share}%` }} />
              </span>
            </div>
          );
        })}
      </div>

      <p className={styles.lensNote}>
        Forecast from this kitchen&apos;s choices; comparisons from {cohort.households} simulated households. Not
        customer data.
      </p>
    </>
  );
}

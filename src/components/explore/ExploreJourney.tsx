"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronsRight, Info, RotateCcw, SkipForward } from "lucide-react";
import { loadCatalog } from "@/catalog/load";
import { locationById } from "@/catalog/grocery-graph";
import { choicesForWeek, isJourneyComplete } from "@/domain/kitchen/state";
import { WEEK_MAX } from "@/domain/kitchen/types";
import type { KitchenState } from "@/domain/kitchen/types";
import { buildWeekIntelligence } from "@/intelligence";
import { buildFixtureKitchen, fixtureById } from "@/simulation/fixtures";
import { householdPolicy } from "@/simulation/policies";
import { simulateJourney, simulateWeek } from "@/simulation/simulate";
import { DecisionChips } from "@/components/kitchen/DecisionChips";
import { WeekRail } from "@/components/kitchen/WeekRail";
import { WeekView } from "@/components/kitchen/WeekView";
import { JourneyComparisonPanel } from "@/components/explore/JourneyComparisonPanel";
import styles from "@/components/explore/explore.module.css";

/**
 * Client-side journey controller for a simulated household. It replays the
 * deterministic simulation in memory; nothing about these households is ever
 * persisted.
 */
export function ExploreJourney({ fixtureId }: { fixtureId: string }) {
  const fixture = fixtureById(fixtureId);
  const catalog = useMemo(() => loadCatalog(), []);

  const [states, setStates] = useState<KitchenState[]>(() =>
    fixture ? [buildFixtureKitchen(fixture)] : [],
  );

  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const kitchen = states[Math.min(index, Math.max(0, states.length - 1))];

  const intelligence = useMemo(
    () => (kitchen ? buildWeekIntelligence(kitchen, catalog) : null),
    [kitchen, catalog],
  );

  if (!fixture || !kitchen || !intelligence) {
    return (
      <div className="container">
        <h1>Unknown household</h1>
        <p>
          <Link href="/explore">Back to the four households</Link>
        </p>
      </div>
    );
  }

  const location = locationById(catalog, kitchen.profile.locationId);
  const completedWeeks = kitchen.weeklyChoices.filter((row) => row.completed).length;
  const previousChoices = kitchen.week > 1 ? choicesForWeek(kitchen, kitchen.week - 1) : null;

  const extendTo = (targetWeek: number): KitchenState[] => {
    const next = [...states];
    let last = next.at(-1);

    if (!last) return next;

    while (last.week < targetWeek && !isJourneyComplete(last)) {
      const result = simulateWeek(last, catalog, householdPolicy);

      if (!result.ok) {
        setError(`${result.error.code}: ${result.error.message}`);

        return next;
      }

      next.push(result.state);
      last = result.state;
    }

    return next;
  };

  const goToWeek = (week: number) => {
    setError(null);
    const next = extendTo(week);
    setStates(next);
    let target = 0;

    for (let i = 0; i < next.length; i += 1) {
      const candidate = next[i];

      if (candidate && candidate.week <= week) target = i;
    }

    setIndex(target);
  };

  const advance = () => {
    goToWeek(kitchen.week + 1);
  };

  const replayToWeek8 = () => {
    setError(null);
    const all = simulateJourney(buildFixtureKitchen(fixture), catalog, householdPolicy);
    setStates(all);
    setIndex(all.length - 1);
  };

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);

      return;
    }

    setError(null);
    setConfirmReset(false);
    setStates([buildFixtureKitchen(fixture)]);
    setIndex(0);
  };

  return (
    <div className="container">
      <p className={styles.backLink}>
        <Link href="/explore">
          <ArrowLeft size={14} aria-hidden /> All households
        </Link>
      </p>

      <p className={styles.simulatedNote}>
        <Info size={14} aria-hidden />
        <span>
          Simulated household · {completedWeeks} of {WEEK_MAX} weeks completed · replay is
          deterministic and nothing is stored ·{" "}
          <a className={styles.jumpLink} href="#journey-comparison">
            Week 1 &rarr; Week 8
          </a>
        </span>
      </p>

      {error ? (
        <p className={styles.error} role="alert">
          The journey could not advance: {error}
        </p>
      ) : null}

      <WeekView
        kitchen={kitchen}
        catalog={catalog}
        intelligence={intelligence}
        householdName={fixture.householdName}
        journeyContext="Simulated replay"
        badges={
          <>
            <span className="pill pill-accent">Simulated</span>
            <span className="pill">{fixture.archetype}</span>
            <span className="pill">{location?.name ?? kitchen.profile.locationId}</span>
            <span className="pill">{kitchen.profile.memberCount} people</span>
          </>
        }
        weekNav={<WeekRail week={kitchen.week} onSelect={goToWeek} />}
        headerActions={
          <>
            <button type="button" className="btn btn-primary btn-small" onClick={advance} disabled={isJourneyComplete(kitchen)}>
              <SkipForward size={14} aria-hidden /> Advance one week
            </button>
            <button type="button" className="btn btn-secondary btn-small" onClick={replayToWeek8}>
              <ChevronsRight size={14} aria-hidden /> Replay to Week 8
            </button>
            <button
              type="button"
              className={`btn btn-small ${confirmReset ? "btn-primary" : "btn-ghost"}`}
              onClick={reset}
              onBlur={() => setConfirmReset(false)}
            >
              <RotateCcw size={14} aria-hidden />{" "}
              {confirmReset ? "Tap again to reset this replay" : "Reset"}
            </button>
          </>
        }
        feedbackSlot={
          previousChoices && previousChoices.substitutionDecisions.length > 0 ? (
            <section className="card" style={{ marginBottom: "1.25rem" }} aria-label="Last week's decisions">
              <DecisionChips
                decisions={previousChoices.substitutionDecisions}
                catalog={catalog}
                label={`Week ${kitchen.week - 1} decisions:`}
              />
            </section>
          ) : null
        }
        substitutionDecisions={choicesForWeek(kitchen, kitchen.week).substitutionDecisions}
      />

      <JourneyComparisonPanel states={states} />
    </div>
  );
}

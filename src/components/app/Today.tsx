"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Repeat } from "lucide-react";
import { WEEK_DAYS } from "@/domain/kitchen/types";
import type { WeekDay } from "@/domain/kitchen/types";
import { humanizeId } from "@/intelligence";
import { buildPantryTimeline, carryOver, orderedPlan } from "@/intelligence/pantry-timeline";
import { dishName } from "@/components/app/food";
import { DAY_LONG, DAY_SHORT, todayWeekDay, useKitchen } from "@/components/app/use-kitchen";
import type { ReadyKitchen } from "@/components/app/use-kitchen";
import { BottomNav, ErrorNote, Loading, Plate } from "@/components/app/ui";
import styles from "@/components/app/app.module.css";

const noSubscribe = () => () => {};

/** The weekday is read on the client only, so the server never guesses it. */
function useToday(): WeekDay | null {
  return useSyncExternalStore(noSubscribe, todayWeekDay, () => null);
}

export function Today() {
  const session = useKitchen();
  const today = useToday();

  if (session.status !== "ready" || !today) return <Loading />;

  return <TodayView session={session} today={today} />;
}

function TodayView({ session, today }: { session: ReadyKitchen; today: WeekDay }) {
  const { catalog, kitchen, intelligence, error } = session;
  const plan = orderedPlan(intelligence.plan);
  const todayIndex = WEEK_DAYS.indexOf(today);
  const meal = plan.find((row) => row.day === today && row.slot === "dinner") ?? plan.find((row) => row.day === today);
  const earlier = plan.filter((row) => WEEK_DAYS.indexOf(row.day) < todayIndex).slice(-2);
  const later = plan.filter((row) => WEEK_DAYS.indexOf(row.day) > todayIndex).slice(0, 2);
  const link = meal ? carryOver(intelligence, today) : null;
  const timeline = buildPantryTimeline(kitchen, catalog, intelligence);

  const pantryAlert = timeline.events.some(
    (event) => event.kind === "use_soon" || (event.kind === "runs_out" && event.cover === "none"),
  );

  const mealItems = meal
    ? intelligence.basket.items.filter((item) => item.usedInRecipeIds.includes(meal.recipeId))
    : [];

  const missing = mealItems.filter((item) => item.status !== "covered").length;

  const rescues = meal
    ? intelligence.useSoon.find((entry) =>
        meal.recipe.ingredients.some((line) => line.ingredientId === entry.ingredientId),
      )
    : undefined;

  return (
    <div className={`${styles.screen} ${styles.tawa}`}>
      <header className={styles.todayHead}>
        <p lang="hi" className={styles.hindi}>आज क्या बनेगा?</p>
        <div className={styles.todayRow}>
          <h1 className={styles.displayLight}>What&apos;s cooking?</h1>
          <span className={styles.weekChip}>
            Week {kitchen.week} · {DAY_SHORT[today]}
          </span>
        </div>
      </header>

      <ErrorNote message={error} />

      {meal ? (
        <section className={styles.hero} aria-label={`${DAY_LONG[today]}'s ${meal.slot}`}>
          <div className={styles.heroPlate}>
            <Plate catalog={catalog} recipe={meal.recipe} size={248} className={styles.glow} />
            <span className={styles.photoNote}>photo to come</span>
          </div>
          <div className={styles.heroChips}>
            <span className={missing === 0 ? styles.chipGood : styles.chipNeutral}>
              {missing === 0 ? "All at home" : `${missing} to get`}
            </span>
            {rescues ? <span className={styles.chipWarm}>Saves the {rescues.ingredient.name.toLowerCase()}</span> : null}
          </div>
          <div className={styles.heroTitleRow}>
            <div>
              <p className={styles.kickerLight}>Tonight · {meal.recipe.estimatedPreparationMinutes} min · {humanizeId(meal.recipe.cuisine)}</p>
              <h2 className={styles.heroTitle}>{dishName(meal.recipe.name)}</h2>
            </div>
            <Link className={styles.swapButton} href={`/week?day=${today}`} aria-label={`Swap ${meal.recipe.name}`}>
              <Repeat size={20} aria-hidden />
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.heroEmpty}>
          <h2 className={styles.heroTitle}>Nothing planned for {DAY_LONG[today].toLowerCase()}.</h2>
          <Link className={styles.primary} href={`/week?day=${today}`}>
            Pick tonight&apos;s dinner <ArrowRight size={18} aria-hidden />
          </Link>
        </section>
      )}

      {link ? (
        <Link className={styles.chainHint} href="/pantry">
          <span className={styles.chainDot} aria-hidden />
          The {link.ingredient.name.toLowerCase()} carries into {DAY_SHORT[link.day]}&apos;s {dishName(link.recipeName)}
        </Link>
      ) : null}

      {earlier.length + later.length > 0 ? (
        <ul className={styles.dayTiles} aria-label="This week">
          {[...earlier, ...later].map((row) => {
            const done = WEEK_DAYS.indexOf(row.day) < todayIndex;

            return (
              <li key={`${row.day}-${row.slot}`} className={styles.dayTile} data-done={done || undefined}>
                <Plate catalog={catalog} recipe={row.recipe} size={52} />
                <div>
                  <p className={styles.tileDay}>{done ? `${DAY_SHORT[row.day]} · cooked` : DAY_SHORT[row.day]}</p>
                  <p className={styles.tileName}>{dishName(row.recipe.name)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {intelligence.planSource === "suggested" && intelligence.plan.length > 0 ? (
        <Link className={styles.suggestNote} href="/week">
          This week is a suggestion. Make it yours <ArrowRight size={16} aria-hidden />
        </Link>
      ) : null}

      <BottomNav pantryAlert={pantryAlert} />
    </div>
  );
}

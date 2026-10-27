"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, X } from "lucide-react";
import type { Catalog, Recipe } from "@/catalog/types";
import { ingredientById } from "@/catalog/grocery-graph";
import { currentChoices, isJourneyComplete } from "@/domain/kitchen/state";
import { WEEK_DAYS, WEEK_MAX } from "@/domain/kitchen/types";
import type { MealSelection, WeekDay } from "@/domain/kitchen/types";
import { formatRupees } from "@/domain/units";
import { humanizeId } from "@/intelligence";
import { closeWeek } from "@/intelligence/week-close";
import type { MealRecommendation } from "@/intelligence/types";
import { dishName } from "@/components/app/food";
import { DAY_LONG, DAY_SHORT, useKitchen } from "@/components/app/use-kitchen";
import type { ReadyKitchen } from "@/components/app/use-kitchen";
import { BottomNav, ErrorNote, Loading, Plate } from "@/components/app/ui";
import styles from "@/components/app/app.module.css";

const SWIPE_THRESHOLD = 96;

function isWeekDay(value: string | null): value is WeekDay {
  return WEEK_DAYS.some((day) => day === value);
}

function sharedWith(
  catalog: Catalog,
  recipe: Recipe,
  week: Map<WeekDay, Recipe>,
  target: WeekDay,
): { day: WeekDay; names: string[] } | null {
  const own = new Set(recipe.ingredients.map((line) => line.ingredientId));
  let best: { day: WeekDay; names: string[] } | null = null;

  for (const [day, other] of week) {
    if (day === target) continue;

    const names = other.ingredients.flatMap((line) => {
      const ingredient = ingredientById(catalog, line.ingredientId);

      if (!ingredient || !own.has(ingredient.id)) return [];

      if (["spice", "fat", "pantry"].includes(ingredient.category)) return [];

      return [ingredient.name.toLowerCase()];
    });

    if (names.length > (best?.names.length ?? 0)) best = { day, names };
  }

  return best;
}

export function WeekPlanner() {
  const session = useKitchen();

  if (session.status !== "ready") return <Loading />;

  return <Planner session={session} />;
}

function Planner({ session }: { session: ReadyKitchen }) {
  const { catalog, kitchen, intelligence, run, replace, error } = session;
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("day");
  const [chosenDay, setChosenDay] = useState<WeekDay | null>(isWeekDay(requested) ? requested : null);
  const [pickingDay, setPickingDay] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);

  const choices = currentChoices(kitchen);
  const dinners = choices.selectedMeals.filter((meal) => meal.slot === "dinner");
  const week = new Map<WeekDay, Recipe>();

  for (const meal of dinners) {
    const recipe = catalog.recipes.find((row) => row.id === meal.recipeId);

    if (recipe) week.set(meal.day, recipe);
  }

  const emptyDays = WEEK_DAYS.filter((day) => !week.has(day));
  const target = chosenDay ?? emptyDays[0] ?? null;
  const usedIds = new Set(dinners.map((meal) => meal.recipeId));

  const candidates: MealRecommendation[] = intelligence.recommendations.filter(
    (row) =>
      row.recipe.mealSlots.includes("dinner") &&
      !usedIds.has(row.recipe.id) &&
      !choices.skippedRecipeIds.includes(row.recipe.id),
  );

  const card = target ? candidates[0] : undefined;
  const complete = isJourneyComplete(kitchen);
  const toBuy = intelligence.basket.items.filter((item) => item.status === "buy");

  const setWeek = (meals: MealSelection[]) => run([{ type: "select_meals", meals }]);

  const add = (recipe: Recipe, day: WeekDay) => {
    const others = choices.selectedMeals.filter((meal) => !(meal.day === day && meal.slot === "dinner"));

    if (setWeek([...others, { day, slot: "dinner", recipeId: recipe.id }])) setChosenDay(null);
  };

  const skip = (recipe: Recipe) => run([{ type: "skip_recommendation", recipeId: recipe.id }]);

  const remove = (day: WeekDay) => {
    setWeek(choices.selectedMeals.filter((meal) => !(meal.day === day && meal.slot === "dinner")));
    setChosenDay(day);
  };

  const fillRest = () => {
    const meals = [...choices.selectedMeals];
    const used = new Set(usedIds);
    const pool = candidates.map((row) => row.recipe);

    for (const day of emptyDays) {
      const suggested = intelligence.suggestedPlan.find(
        (meal) => meal.day === day && !used.has(meal.recipeId),
      )?.recipe;

      const recipe = suggested ?? pool.find((row) => !used.has(row.id));

      if (!recipe) continue;
      used.add(recipe.id);
      meals.push({ day, slot: "dinner", recipeId: recipe.id });
    }

    if (setWeek(meals)) setChosenDay(null);
  };

  const finishWeek = () => {
    const closed = closeWeek(kitchen, catalog, intelligence);

    if (!closed.ok) return;
    replace(closed.state);
    router.push(closed.state.week > kitchen.week ? "/remix" : "/kitchen");
  };

  const release = () => {
    if (card && target && drag > SWIPE_THRESHOLD) add(card.recipe, target);
    else if (card && drag < -SWIPE_THRESHOLD) skip(card.recipe);
    start.current = null;
    setDrag(0);
  };

  const owned = card?.impact.ownedIngredientIds.length ?? 0;
  const total = owned + (card?.impact.missingIngredientIds.length ?? 0);
  const shares = card && target ? sharedWith(catalog, card.recipe, week, target) : null;

  return (
    <div className={`${styles.screen} ${styles.sunny}`}>
      <header className={styles.topBar}>
        <div>
          <p className={styles.kicker}>Week {kitchen.week} of {WEEK_MAX}</p>
          <h1 className={styles.title}>{emptyDays.length > 0 ? "Fill your week" : "Your week"}</h1>
        </div>
        <span className={styles.counter}>
          {week.size} of 7 dinners
        </span>
      </header>

      <ol className={styles.dayDots} aria-label="This week's dinners">
        {WEEK_DAYS.map((day) => {
          const recipe = week.get(day);

          return (
            <li key={day}>
              <button
                type="button"
                className={styles.dayDot}
                data-target={day === target || undefined}
                data-filled={recipe ? true : undefined}
                aria-label={`${DAY_LONG[day]}: ${recipe?.name ?? "empty"}`}
                onClick={() => setChosenDay(day)}
              >
                {recipe ? <Plate catalog={catalog} recipe={recipe} size={34} /> : null}
              </button>
              <span>{DAY_SHORT[day].charAt(0)}</span>
            </li>
          );
        })}
      </ol>

      <ErrorNote message={error} />

      {complete ? (
        <section className={styles.doneCard}>
          <h2 className={styles.cardTitle}>Eight weeks cooked.</h2>
          <p>See what your kitchen learned.</p>
          <Link className={styles.primary} href="/kitchen">Open Kitchen <ArrowRight size={18} aria-hidden /></Link>
        </section>
      ) : target && card ? (
        <section className={styles.deck} aria-label={`Suggestion for ${DAY_LONG[target]}`}>
                  <article
            className={styles.swipeCard}
            style={{ transform: `translateX(${drag}px) rotate(${drag / 18}deg)` }}
            onPointerDown={(event) => {
              start.current = event.clientX;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (start.current !== null) setDrag(event.clientX - start.current);
            }}
            onPointerUp={release}
            onPointerCancel={() => {
              start.current = null;
              setDrag(0);
            }}
          >
            <div className={styles.cardPlate}>
              <Plate catalog={catalog} recipe={card.recipe} size={196} />
              <span className={styles.homeBadge}>
                {owned} of {total} at home
              </span>
            </div>
            <h2 className={styles.cardTitle}>{dishName(card.recipe.name)}</h2>
            <p className={styles.cardMeta}>
              {humanizeId(card.recipe.cuisine)} · {card.recipe.estimatedPreparationMinutes} min · goes to {DAY_SHORT[target]}
            </p>
            {shares ? (
              <p className={styles.cardLink}>
                Shares {shares.names.slice(0, 2).join(" and ")} with {DAY_SHORT[shares.day]}
              </p>
            ) : null}
          </article>
          <div className={styles.deckActions}>
            <button type="button" className={styles.roundButton} aria-label={`Not ${card.recipe.name}`} onClick={() => skip(card.recipe)}>
              <X size={24} aria-hidden />
            </button>
            <button type="button" className={styles.addButton} onClick={() => add(card.recipe, target)}>
              Add to {DAY_SHORT[target]}
            </button>
            <button
              type="button"
              className={styles.roundButton}
              aria-label="Pick a different day"
              aria-expanded={pickingDay}
              onClick={() => setPickingDay((open) => !open)}
            >
              <CalendarDays size={22} aria-hidden />
            </button>
          </div>
          {pickingDay ? (
            <div className={styles.dayPicker} role="group" aria-label="Add to day">
              {WEEK_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    add(card.recipe, day);
                    setPickingDay(false);
                  }}
                >
                  {DAY_SHORT[day]}
                </button>
              ))}
            </div>
          ) : null}
          <div className={styles.deckFooter}>
            {week.has(target) ? (
              <button type="button" className={styles.quiet} onClick={() => remove(target)}>
                Clear {DAY_SHORT[target]}
              </button>
            ) : null}
            {emptyDays.length > 0 ? (
              <button type="button" className={styles.quiet} onClick={fillRest}>
                Fill the rest for me
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <ul className={styles.weekList}>
          {WEEK_DAYS.map((day) => {
            const recipe = week.get(day);

            return recipe ? (
              <li key={day}>
                <button type="button" className={styles.weekRow} onClick={() => setChosenDay(day)}>
                  <span className={styles.weekDay}>{DAY_SHORT[day]}</span>
                  <Plate catalog={catalog} recipe={recipe} size={44} />
                  <span className={styles.weekName}>{dishName(recipe.name)}</span>
                  <span className={styles.weekSwap}>Change</span>
                </button>
              </li>
            ) : null;
          })}
        </ul>
      )}

      {!complete && week.size > 0 ? (
        <div className={styles.footer}>
          {toBuy.length > 0 ? (
            <Link className={styles.primaryDark} href="/checkout">
              Get {toBuy.length} items · {formatRupees(intelligence.basket.totalCost)}
              <ArrowRight size={18} aria-hidden />
            </Link>
          ) : (
            <button type="button" className={styles.primaryDark} onClick={finishWeek}>
              Wrap up week {kitchen.week}
              <ArrowRight size={18} aria-hidden />
            </button>
          )}
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}

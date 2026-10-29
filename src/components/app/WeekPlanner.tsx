"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, ChevronsLeft, ChevronsRight, Plus, X } from "lucide-react";
import type { Catalog, Recipe } from "@/catalog/types";
import { ingredientById } from "@/catalog/grocery-graph";
import { currentChoices, isJourneyComplete } from "@/domain/kitchen/state";
import { MEAL_SLOTS, WEEK_DAYS, WEEK_MAX } from "@/domain/kitchen/types";
import type { MealSelection, MealSlot, WeekDay } from "@/domain/kitchen/types";
import { formatRupees } from "@/domain/units";
import { humanizeId } from "@/intelligence";
import { closeWeek } from "@/intelligence/week-close";
import type { MealRecommendation } from "@/intelligence/types";
import { dishName } from "@/components/app/food";
import { needsHomeCheck } from "@/components/app/starter-kitchen";
import { DAY_LONG, DAY_SHORT, SLOT_LABEL, useKitchen } from "@/components/app/use-kitchen";
import type { ReadyKitchen } from "@/components/app/use-kitchen";
import { BottomNav, ErrorNote, Loading, Plate } from "@/components/app/ui";
import styles from "@/components/app/app.module.css";

const SWIPE_THRESHOLD = 96;

type SlotKey = `${WeekDay}:${MealSlot}`;

type Target = { day: WeekDay; slot: MealSlot };

const keyOf = (day: WeekDay, slot: MealSlot): SlotKey => `${day}:${slot}`;

function isWeekDay(value: string | null): value is WeekDay {
  return WEEK_DAYS.some((day) => day === value);
}

/** The other planned meal this one shares the most fresh ingredients with. */
function sharedWith(
  catalog: Catalog,
  recipe: Recipe,
  meals: Map<SlotKey, Recipe>,
  target: Target,
): { day: WeekDay; names: string[] } | null {
  const own = new Set(recipe.ingredients.map((line) => line.ingredientId));
  let best: { day: WeekDay; names: string[] } | null = null;

  for (const [key, other] of meals) {
    if (key === keyOf(target.day, target.slot)) continue;

    const names = other.ingredients.flatMap((line) => {
      const ingredient = ingredientById(catalog, line.ingredientId);

      if (!ingredient || !own.has(ingredient.id)) return [];

      if (["spice", "fat", "pantry"].includes(ingredient.category)) return [];

      return [ingredient.name.toLowerCase()];
    });

    const day = WEEK_DAYS.find((row) => key.startsWith(`${row}:`));

    if (day && names.length > (best?.names.length ?? 0)) best = { day, names };
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

  const [chosen, setChosen] = useState<Target | { day: WeekDay; slot: null } | null>(
    isWeekDay(requested) ? { day: requested, slot: null } : null,
  );

  const [pickingDay, setPickingDay] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);

  const choices = currentChoices(kitchen);
  const slots = MEAL_SLOTS.filter((slot) => kitchen.profile.mealSlots.includes(slot));
  const skippedDays = new Set(choices.skippedDays);
  const meals = new Map<SlotKey, Recipe>();

  for (const meal of choices.selectedMeals) {
    const recipe = catalog.recipes.find((row) => row.id === meal.recipeId);

    if (recipe) meals.set(keyOf(meal.day, meal.slot), recipe);
  }

  const open: Target[] = WEEK_DAYS.filter((day) => !skippedDays.has(day)).flatMap((day) =>
    slots.filter((slot) => !meals.has(keyOf(day, slot))).map((slot) => ({ day, slot })),
  );

  const target: Target | null = (() => {
    if (!chosen) return open[0] ?? null;

    if (chosen.slot) return chosen;

    const daySlot = slots.find((slot) => !meals.has(keyOf(chosen.day, slot))) ?? slots[0];

    return daySlot ? { day: chosen.day, slot: daySlot } : null;
  })();

  const targetOff = target ? skippedDays.has(target.day) : false;
  const usedIds = new Set(choices.selectedMeals.map((meal) => meal.recipeId));

  const candidates = (slot: MealSlot): MealRecommendation[] =>
    intelligence.recommendations.filter(
      (row) =>
        row.recipe.mealSlots.includes(slot) &&
        !usedIds.has(row.recipe.id) &&
        !choices.skippedRecipeIds.includes(row.recipe.id),
    );

  const card = target && !targetOff ? candidates(target.slot)[0] : undefined;
  const complete = isJourneyComplete(kitchen);
  const toBuy = intelligence.basket.items.filter((item) => item.status === "buy");
  const planned = choices.selectedMeals.length;
  const capacity = (WEEK_DAYS.length - skippedDays.size) * slots.length;
  const askHome = needsHomeCheck(kitchen);

  const setWeek = (next: MealSelection[]) => run([{ type: "select_meals", meals: next }]);

  const add = (recipe: Recipe, at: Target) => {
    const others = choices.selectedMeals.filter((meal) => !(meal.day === at.day && meal.slot === at.slot));

    if (setWeek([...others, { ...at, recipeId: recipe.id }])) setChosen(null);
  };

  const pass = (recipe: Recipe) => run([{ type: "skip_recommendation", recipeId: recipe.id }]);

  const clear = (at: Target) => {
    setWeek(choices.selectedMeals.filter((meal) => !(meal.day === at.day && meal.slot === at.slot)));
    setChosen(at);
  };

  const setDayOff = (day: WeekDay, off: boolean) => {
    if (run([{ type: "set_day_skipped", day, skipped: off }])) setChosen(off ? null : { day, slot: null });
  };

  const fillRest = () => {
    const next = [...choices.selectedMeals];
    const used = new Set(usedIds);

    for (const slot of open) {
      const suggested = intelligence.suggestedPlan.find(
        (meal) => meal.day === slot.day && meal.slot === slot.slot && !used.has(meal.recipeId),
      )?.recipe;

      const recipe = suggested ?? candidates(slot.slot).find((row) => !used.has(row.recipe.id))?.recipe;

      if (!recipe) continue;
      used.add(recipe.id);
      next.push({ ...slot, recipeId: recipe.id });
    }

    if (setWeek(next)) setChosen(null);
  };

  const finishWeek = () => {
    const closed = closeWeek(kitchen, catalog, intelligence);

    if (!closed.ok) return;
    replace(closed.state);
    router.push(closed.state.week > kitchen.week ? "/remix" : "/kitchen");
  };

  const decide = (direction: "add" | "pass") => {
    if (!card || !target) return;

    if (direction === "add") add(card.recipe, target);
    else pass(card.recipe);
  };

  // Arrow keys swipe on desktop. Re-bound every render so it sees this card.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") decide("add");

      if (event.key === "ArrowLeft") decide("pass");
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  });

  const release = () => {
    if (drag > SWIPE_THRESHOLD) decide("add");
    else if (drag < -SWIPE_THRESHOLD) decide("pass");
    start.current = null;
    setDrag(0);
  };

  const owned = card?.impact.ownedIngredientIds.length ?? 0;
  const total = owned + (card?.impact.missingIngredientIds.length ?? 0);
  const shares = card && target ? sharedWith(catalog, card.recipe, meals, target) : null;
  const lean = Math.max(-1, Math.min(1, drag / SWIPE_THRESHOLD));
  const plateSize = slots.length === 1 ? 34 : slots.length === 2 ? 22 : 17;

  const board = (
    <ul className={styles.board} aria-label="This week">
      {WEEK_DAYS.map((day) => {
        const off = skippedDays.has(day);

        return (
          <li key={day} className={styles.boardDay} data-off={off || undefined}>
            <span className={styles.boardDayName}>{DAY_SHORT[day]}</span>
            {off ? (
              <div className={styles.boardOff}>
                <span>Not cooking</span>
                <button type="button" className={styles.quiet} onClick={() => setDayOff(day, false)}>
                  Cook
                </button>
              </div>
            ) : (
              <div className={styles.boardSlots}>
                {slots.map((slot) => {
                  const recipe = meals.get(keyOf(day, slot));
                  const current = target?.day === day && target.slot === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      className={styles.boardSlot}
                      data-current={current || undefined}
                      data-empty={recipe ? undefined : true}
                      onClick={() => setChosen({ day, slot })}
                    >
                      {recipe ? <Plate catalog={catalog} recipe={recipe} size={36} /> : <Plus size={16} aria-hidden />}
                      <span className={styles.boardSlotText}>
                        {slots.length > 1 ? <span className={styles.boardSlotLabel}>{SLOT_LABEL[slot]}</span> : null}
                        <span className={styles.boardSlotName}>{recipe ? dishName(recipe.name) : "Pick"}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className={`${styles.screen} ${styles.sunny} ${styles.wide}`}>
      <header className={styles.topBar}>
        <div>
          <p className={styles.kicker}>Week {kitchen.week} of {WEEK_MAX}</p>
          <h1 className={styles.title}>{open.length > 0 ? "Fill your week" : "Your week"}</h1>
        </div>
        <span className={styles.counter}>
          {planned} of {capacity} meals
        </span>
      </header>

      <ol className={styles.dayDots} aria-label="This week's meals">
        {WEEK_DAYS.map((day) => {
          const off = skippedDays.has(day);
          const dayMeals = slots.flatMap((slot) => meals.get(keyOf(day, slot)) ?? []);

          return (
            <li key={day}>
              <button
                type="button"
                className={styles.dayDot}
                data-target={target?.day === day || undefined}
                data-filled={dayMeals.length === slots.length || undefined}
                data-off={off || undefined}
                aria-label={`${DAY_LONG[day]}: ${off ? "not cooking" : `${dayMeals.length} of ${slots.length} planned`}`}
                onClick={() => setChosen({ day, slot: null })}
              >
                {off ? <X size={16} aria-hidden /> : dayMeals.map((recipe) => (
                  <Plate key={recipe.id} catalog={catalog} recipe={recipe} size={plateSize} />
                ))}
              </button>
              <span>{DAY_SHORT[day].charAt(0)}</span>
            </li>
          );
        })}
      </ol>

      <ErrorNote message={error} />

      <div className={styles.plannerGrid}>
        <div className={styles.deckColumn}>
          {complete ? (
            <section className={styles.doneCard}>
              <h2 className={styles.cardTitle}>Eight weeks cooked.</h2>
              <p>See what your kitchen learned.</p>
              <Link className={styles.primary} href="/kitchen">Open Kitchen <ArrowRight size={18} aria-hidden /></Link>
            </section>
          ) : target && targetOff ? (
            <section className={styles.offCard}>
              <h2 className={styles.cardTitle}>{DAY_LONG[target.day]} off.</h2>
              <p>Eating out, or someone else is cooking.</p>
              <button type="button" className={styles.primary} onClick={() => setDayOff(target.day, false)}>
                Cook on {DAY_SHORT[target.day]}
              </button>
            </section>
          ) : target && card ? (
            <section className={styles.deck} aria-label={`Suggestion for ${DAY_LONG[target.day]} ${SLOT_LABEL[target.slot]}`}>
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
                <span className={styles.stampAdd} style={{ opacity: Math.max(0, lean) }} aria-hidden>Add</span>
                <span className={styles.stampPass} style={{ opacity: Math.max(0, -lean) }} aria-hidden>Pass</span>
                <p className={styles.slotChip}>
                  {DAY_SHORT[target.day]} · {SLOT_LABEL[target.slot]}
                </p>
                <div className={styles.cardPlate}>
                  <Plate catalog={catalog} recipe={card.recipe} size={196} />
                  <span className={styles.homeBadge}>
                    {owned} of {total} at home
                  </span>
                </div>
                <h2 className={styles.cardTitle}>{dishName(card.recipe.name)}</h2>
                <p className={styles.cardMeta}>
                  {humanizeId(card.recipe.cuisine)} · {card.recipe.estimatedPreparationMinutes} min
                </p>
                {shares ? (
                  <p className={styles.cardLink}>
                    Shares {shares.names.slice(0, 2).join(" and ")} with {DAY_SHORT[shares.day]}
                  </p>
                ) : null}
              </article>
              <p className={styles.swipeHint} aria-hidden>
                <span><ChevronsLeft size={16} /> Swipe to pass</span>
                <span>Swipe to add <ChevronsRight size={16} /></span>
              </p>
              <div className={styles.deckActions}>
                <button type="button" className={styles.roundButton} aria-label={`Pass on ${card.recipe.name}`} onClick={() => pass(card.recipe)}>
                  <X size={24} aria-hidden />
                </button>
                <button type="button" className={styles.addButton} onClick={() => add(card.recipe, target)}>
                  Add to {DAY_SHORT[target.day]}
                </button>
                <button
                  type="button"
                  className={styles.roundButton}
                  aria-label="Pick a different day"
                  aria-expanded={pickingDay}
                  onClick={() => setPickingDay((isOpen) => !isOpen)}
                >
                  <CalendarDays size={22} aria-hidden />
                </button>
              </div>
              {pickingDay ? (
                <div className={styles.dayPicker} role="group" aria-label="Add to day">
                  {WEEK_DAYS.filter((day) => !skippedDays.has(day)).map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        add(card.recipe, { day, slot: target.slot });
                        setPickingDay(false);
                      }}
                    >
                      {DAY_SHORT[day]}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className={styles.deckFooter}>
                <button type="button" className={styles.quiet} onClick={() => setDayOff(target.day, true)}>
                  Skip {DAY_SHORT[target.day]}
                </button>
                {meals.has(keyOf(target.day, target.slot)) ? (
                  <button type="button" className={styles.quiet} onClick={() => clear(target)}>
                    Clear
                  </button>
                ) : null}
                {open.length > 1 ? (
                  <button type="button" className={styles.quiet} onClick={fillRest}>
                    Fill the rest for me
                  </button>
                ) : null}
              </div>
            </section>
          ) : (
            <section className={styles.offCard}>
              <h2 className={styles.cardTitle}>{planned > 0 ? "Week planned." : "Nothing to plan."}</h2>
              <p>Tap any meal to change it.</p>
            </section>
          )}
        </div>
        <aside className={styles.boardColumn} data-primary={card || targetOff ? undefined : true}>
          {board}
        </aside>
      </div>

      {!complete && planned > 0 ? (
        <div className={styles.footer}>
          {askHome ? (
            <Link className={styles.primaryDark} href="/stock">
              Next: what&apos;s at home
              <ArrowRight size={18} aria-hidden />
            </Link>
          ) : toBuy.length > 0 ? (
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

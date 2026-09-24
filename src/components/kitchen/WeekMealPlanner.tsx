"use client";

import type { Catalog } from "@/catalog/types";
import { MEAL_SLOTS, WEEK_DAYS } from "@/domain/kitchen/types";
import type { MealSelection, MealSlot, WeekDay } from "@/domain/kitchen/types";
import { humanizeId } from "@/intelligence";
import styles from "@/components/kitchen/kitchen.module.css";

export function WeekMealPlanner({
  catalog,
  selections,
  disabled,
  onChange,
}: {
  catalog: Catalog;
  selections: MealSelection[];
  disabled: boolean;
  onChange: (day: WeekDay, slot: MealSlot, recipeId: string) => void;
}) {
  const selected = (day: WeekDay, slot: MealSlot) =>
    selections.find((meal) => meal.day === day && meal.slot === slot)?.recipeId ?? "";

  return (
    <section className={styles.mealPlanner} aria-labelledby="week-meal-plan-title">
      <div className={styles.panelHeader}>
        <div>
          <h3 id="week-meal-plan-title" className={styles.panelTitle}>Plan this week</h3>
          <p className={styles.panelHint}>Choose up to three meals per day. Every slot is optional.</p>
        </div>
        <span className="pill pill-positive">{selections.length} of 21 selected</span>
      </div>
      <div className={styles.plannerGrid}>
        {WEEK_DAYS.map((day) => (
          <fieldset className={styles.plannerDay} key={day}>
            <legend>{humanizeId(day)}</legend>
            {MEAL_SLOTS.map((slot) => (
              <label className={styles.plannerField} key={slot}>
                <span>{humanizeId(slot)}</span>
                <select
                  value={selected(day, slot)}
                  disabled={disabled}
                  onChange={(event) => onChange(day, slot, event.target.value)}
                >
                  <option value="">No meal</option>
                  {catalog.recipes
                    .filter((recipe) => recipe.mealSlots.includes(slot))
                    .map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                    ))}
                </select>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </section>
  );
}

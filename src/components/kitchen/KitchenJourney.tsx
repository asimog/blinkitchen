"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { loadCatalog } from "@/catalog/load";
import { locationById, recipeRequirements } from "@/catalog/grocery-graph";
import { roundQuantity } from "@/domain/units";
import { applyKitchenCommand } from "@/domain/kitchen/commands";
import type { KitchenCommand, KitchenError } from "@/domain/kitchen/commands";
import { choicesForWeek, isJourneyComplete } from "@/domain/kitchen/state";
import type { KitchenState, MealSlot, WeekDay } from "@/domain/kitchen/types";
import type { Unit } from "@/domain/units";
import { buildWeekIntelligence } from "@/intelligence";
import { effectiveRequirement } from "@/intelligence/basket";
import { deriveUseSoon } from "@/intelligence/use-soon";
import { clearKitchen, saveKitchen } from "@/storage/kitchen-storage";
import { useStoredKitchen } from "@/storage/use-stored-kitchen";
import { DecisionChips } from "@/components/kitchen/DecisionChips";
import { UsageRecorder } from "@/components/kitchen/UsageRecorder";
import { WeekChecklist, buildChecklistState } from "@/components/kitchen/WeekChecklist";
import { WeekView } from "@/components/kitchen/WeekView";
import { WeekMealPlanner } from "@/components/kitchen/WeekMealPlanner";
import { kitchenErrorCopy } from "@/components/kitchen/error-copy";
import styles from "@/components/kitchen/kitchen.module.css";

/**
 * The interactive household journey. The kitchen lives in React state seeded
 * from localStorage; every action is a pure domain command whose result is
 * saved back as facts. Recommendations are always recomputed.
 */
export function KitchenJourney() {
  const stored = useStoredKitchen();
  const catalog = useMemo(() => loadCatalog(), []);
  const [edited, setEdited] = useState<KitchenState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const kitchen = edited ?? (stored.status === "ready" ? stored.kitchen : null);

  const intelligence = useMemo(
    () => (kitchen ? buildWeekIntelligence(kitchen, catalog) : null),
    [kitchen, catalog],
  );

  if (stored.status === "loading") {
    return (
      <div className="container" aria-busy="true">
        <section style={{ padding: "2.5rem 0", maxWidth: "60ch" }}>
          <p className="eyebrow">My kitchen</p>
          <h1 style={{ fontSize: "1.9rem" }}>Loading your kitchen…</h1>
          <p className="muted">Reading the household stored in this browser.</p>
        </section>
      </div>
    );
  }

  if (!kitchen || !intelligence) {
    return (
      <div className="container">
        <section style={{ padding: "2.5rem 0", maxWidth: "60ch" }}>
          <p className="eyebrow">My kitchen</p>
          <h1 style={{ fontSize: "1.9rem" }}>No household in this browser yet</h1>
          <p className="muted">
            Build a household to start Week 1, or explore the four simulated kitchens to see what
            the eight-week loop looks like.
          </p>
          <p>
            <Link className="btn btn-primary" href="/build">
              Build your household
            </Link>{" "}
            <Link className="btn btn-secondary" href="/explore">
              Explore households
            </Link>
          </p>
        </section>
      </div>
    );
  }

  const complete = isJourneyComplete(kitchen);
  const checklist = buildChecklistState(kitchen, intelligence);
  const decisions = choicesForWeek(kitchen, kitchen.week).substitutionDecisions;
  const selectedMeals = choicesForWeek(kitchen, kitchen.week).selectedMeals;
  const location = locationById(catalog, kitchen.profile.locationId);

  const applyAll = (commands: KitchenCommand[]): KitchenState | null => {
    let current = kitchen;
    let failure: KitchenError | null = null;

    for (const command of commands) {
      const result = applyKitchenCommand(current, command);

      if (!result.ok) {
        failure = result.error;
        break;
      }

      current = result.state;
    }

    if (failure) {
      setError(kitchenErrorCopy(failure));

      return null;
    }

    setError(null);
    setEdited(current);
    const saved = saveKitchen(current);
    setStorageWarning(
      saved ? null : "This browser refused to save the household — facts will be lost on reload.",
    );

    return current;
  };

  const setMealSlot = (day: WeekDay, slot: MealSlot, recipeId: string) => {
    const remaining = selectedMeals.filter((meal) => meal.day !== day || meal.slot !== slot);
    const meals = recipeId ? [...remaining, { day, slot, recipeId }] : remaining;
    applyAll([{ type: "select_meals", meals }]);
  };

  const receiveBasket = () => {
    const lines = intelligence.basket.items
      .filter((item) => item.status === "buy" && item.purchasedQuantity > 0)
      .map((item) => ({
        ingredientId: item.ingredientId,
        quantity: item.purchasedQuantity,
        unit: item.unit,
      }));

    if (lines.length === 0) return;
    applyAll([{ type: "receive_grocery", lines }]);
  };

  const cookMeals = () => {
    const commands: KitchenCommand[] = [];

    for (const meal of intelligence.plan) {
      const alreadyCooked = kitchen.mealFacts.some(
        (fact) => fact.week === kitchen.week && fact.day === meal.day && fact.slot === meal.slot,
      );

      if (alreadyCooked) continue;
      const scale = kitchen.profile.memberCount / meal.recipe.servings;

      for (const requirement of recipeRequirements(catalog, meal.recipe)) {
        const effective = effectiveRequirement(kitchen, catalog, requirement);
        const quantity = roundQuantity(effective.quantity * scale);

        if (quantity > 0) {
          commands.push({
            type: "consume_ingredient",
            ingredientId: effective.ingredientId,
            quantity,
            unit: effective.unit,
          });
        }
      }

      commands.push({
        type: "complete_meal",
        recipeId: meal.recipeId,
        day: meal.day,
        slot: meal.slot,
      });
    }

    if (commands.length === 0) return;
    applyAll(commands);
  };

  const wasteLeftovers = () => {
    const usedIngredientIds = new Set<string>();

    for (const meal of intelligence.plan) {
      for (const requirement of recipeRequirements(catalog, meal.recipe)) {
        usedIngredientIds.add(
          effectiveRequirement(kitchen, catalog, requirement).ingredientId,
        );
      }
    }

    const commands: KitchenCommand[] = deriveUseSoon(kitchen, catalog)
      .filter((entry) => !usedIngredientIds.has(entry.ingredientId))
      .map((entry) => ({
        type: "waste_ingredient",
        ingredientId: entry.ingredientId,
        quantity: entry.quantity,
        unit: entry.unit,
      }));

    if (commands.length === 0) {
      setError("No unrescued use-soon items to record as spoilage.");

      return;
    }

    applyAll(commands);
  };

  const recordUsage = (kind: "used" | "wasted", ingredientId: string, quantity: number, unit: Unit) => {
    applyAll([
      kind === "used"
        ? { type: "consume_ingredient", ingredientId, quantity, unit }
        : { type: "waste_ingredient", ingredientId, quantity, unit },
    ]);
  };

  const resetPrototype = () => {
    if (!confirmReset) {
      setConfirmReset(true);

      return;
    }

    clearKitchen();
    setEdited(null);
    setConfirmReset(false);
    setError(null);
  };

  return (
    <div className="container">
      {complete ? (
        <section className={styles.completePanel} aria-label="Journey complete">
          <p className="eyebrow">Eight weeks complete</p>
          <h2 style={{ margin: 0 }}>What the kitchen taught Blinkitchen</h2>
          <ul className={styles.completeStats}>
            <li>
              <strong>{kitchen.mealFacts.length}</strong> meals recorded
            </li>
            <li>
              <strong>{kitchen.groceryFacts.length}</strong> grocery lines received
            </li>
            <li>
              <strong>
                {kitchen.weeklyChoices.reduce(
                  (total, row) => total + row.substitutionDecisions.filter((d) => d.accepted).length,
                  0,
                )}
              </strong>{" "}
              swaps accepted
            </li>
            <li>
              <strong>
                {kitchen.consumptionFacts.filter((fact) => fact.kind === "wasted").length}
              </strong>{" "}
              spoilage records
            </li>
          </ul>
          <p className="small muted" style={{ margin: "0.75rem 0 0" }}>
            The summary below is derived from the facts above — nothing else was stored.
          </p>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}

      {storageWarning ? (
        <p role="alert" className={styles.error}>
          {storageWarning}
        </p>
      ) : null}

      <WeekView
        kitchen={kitchen}
        catalog={catalog}
        intelligence={intelligence}
        householdName={kitchen.profile.displayName}
        badges={
          <>
            <span className="pill pill-positive">My kitchen</span>
            <span className="pill">{location?.name ?? kitchen.profile.locationId}</span>
            <span className="pill">{kitchen.profile.memberCount} people</span>
            <span className="pill">₹{kitchen.profile.weeklyBudget}/week budget</span>
          </>
        }
        headerActions={
          <button
            type="button"
            className={`btn btn-small ${confirmReset ? "btn-primary" : "btn-ghost"}`}
            onClick={resetPrototype}
            onBlur={() => setConfirmReset(false)}
          >
            {confirmReset ? "Tap again to erase this household" : "Reset prototype"}
          </button>
        }
        mealsHeading="What you could cook"
        mealPlanner={
          <WeekMealPlanner
            catalog={catalog}
            selections={selectedMeals}
            disabled={complete}
            onChange={setMealSlot}
          />
        }
        substitutionDecisions={decisions}
        onSubstitutionDecision={(substitutionId, accepted) =>
          applyAll([{ type: "decide_substitution", substitutionId, accepted }])
        }
        feedbackSlot={
          <>
            {decisions.length > 0 ? (
              <section className="card" style={{ marginBottom: "1.25rem" }} aria-label="This week's decisions">
                <DecisionChips decisions={decisions} catalog={catalog} label="This week:" />
              </section>
            ) : null}
            {!complete ? (
              <>
                <WeekChecklist
                  week={kitchen.week}
                  checklist={checklist}
                  basketCost={intelligence.basket.totalCost}
                  toBuyCount={intelligence.basket.items.filter((item) => item.status === "buy").length}
                  spoilageCandidates={intelligence.useSoon.length}
                  onReceiveBasket={receiveBasket}
                  onCookMeals={cookMeals}
                  onWasteLeftovers={wasteLeftovers}
                  onCompleteWeek={() => applyAll([{ type: "complete_week" }])}
                />
                <UsageRecorder kitchen={kitchen} catalog={catalog} onRecord={recordUsage} />
              </>
            ) : null}
          </>
        }
      />
    </div>
  );
}

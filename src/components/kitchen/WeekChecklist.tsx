import type { ReactNode } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { formatRupees } from "@/domain/units";
import type { KitchenState } from "@/domain/kitchen/types";
import type { WeekIntelligence } from "@/intelligence";
import styles from "@/components/kitchen/kitchen.module.css";

export type WeekChecklistState = {
  basketReceived: boolean;
  mealsCooked: number;
  plannedMeals: number;
  leftoversWasted: number;
  weekComplete: boolean;
};

export function WeekChecklist({
  week,
  checklist,
  basketCost,
  toBuyCount,
  onReceiveBasket,
  onCookMeals,
  onWasteLeftovers,
  onCompleteWeek,
}: {
  week: number;
  checklist: WeekChecklistState;
  basketCost: number;
  toBuyCount: number;
  onReceiveBasket: () => void;
  onCookMeals: () => void;
  onWasteLeftovers: () => void;
  onCompleteWeek: () => void;
}) {
  const allCooked =
    checklist.plannedMeals === 0 || checklist.mealsCooked >= checklist.plannedMeals;
  const rows: { label: string; detail: string; done: boolean; action?: ReactNode }[] = [
    {
      label: "Receive the simulated basket",
      detail:
        toBuyCount > 0
          ? `${toBuyCount} items · ${formatRupees(basketCost)} estimated`
          : "nothing to buy — the pantry covers the plan",
      done: checklist.basketReceived || toBuyCount === 0,
      action:
        toBuyCount > 0 && !checklist.basketReceived ? (
          <button type="button" className="btn btn-primary btn-small" onClick={onReceiveBasket}>
            Receive basket
          </button>
        ) : undefined,
    },
    {
      label: "Cook the planned meals",
      detail:
        checklist.plannedMeals === 0
          ? "no meals planned yet"
          : `${checklist.mealsCooked} of ${checklist.plannedMeals} cooked (records pantry use)`,
      done: checklist.plannedMeals === 0 || checklist.mealsCooked >= checklist.plannedMeals,
      action:
        !allCooked ? (
          <button type="button" className="btn btn-primary btn-small" onClick={onCookMeals}>
            Cook {checklist.plannedMeals - checklist.mealsCooked} planned meals
          </button>
        ) : undefined,
    },
    {
      label: "Mark spoilage",
      detail:
        checklist.leftoversWasted > 0
          ? `${checklist.leftoversWasted} use-soon items recorded as wasted`
          : "optional — records use-soon items you could not rescue",
      done: checklist.leftoversWasted > 0,
      action:
        checklist.leftoversWasted === 0 ? (
          <button type="button" className="btn btn-secondary btn-small" onClick={onWasteLeftovers}>
            Record spoilage
          </button>
        ) : undefined,
    },
    {
      label: "Complete the week",
      detail: checklist.weekComplete
        ? "the week is already complete"
        : allCooked
          ? "advances to the next week and closes the facts"
          : "cook or remove the planned meals first",
      done: checklist.weekComplete,
      action:
        !checklist.weekComplete && allCooked ? (
          <button type="button" className="btn btn-primary btn-small" onClick={onCompleteWeek}>
            Complete week {week}
          </button>
        ) : undefined,
    },
  ];

  return (
    <section className={styles.panel} aria-label="Your week, step by step">
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Your week, step by step</h3>
        <p className={styles.panelHint}>Every action records a fact; nothing is saved twice</p>
      </div>
      <ul className={styles.checklist}>
        {rows.map((row) => (
          <li key={row.label} className={styles.checklistRow}>
            <span className={styles.checklistIcon} aria-hidden>
              {row.done ? (
                <CheckCircle2 size={18} color="var(--primary)" />
              ) : (
                <Circle size={18} color="var(--border-strong)" />
              )}
            </span>
            <span className={styles.checklistText}>
              <strong>{row.label}</strong>
              <span className="small muted">{row.detail}</span>
            </span>
            <span className={styles.checklistAction}>{row.action}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Compute checklist state from facts (never stored). */
export function buildChecklistState(
  kitchen: KitchenState,
  intelligence: WeekIntelligence,
): WeekChecklistState {
  const week = kitchen.week;
  return {
    basketReceived: kitchen.groceryFacts.some((fact) => fact.week === week),
    mealsCooked: kitchen.mealFacts.filter((fact) => fact.week === week).length,
    plannedMeals: intelligence.plan.length,
    leftoversWasted: kitchen.consumptionFacts.filter(
      (fact) => fact.week === week && fact.kind === "wasted",
    ).length,
    weekComplete:
      kitchen.weeklyChoices.find((row) => row.week === week)?.completed ?? false,
  };
}

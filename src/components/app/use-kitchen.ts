"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCatalog } from "@/catalog/load";
import type { Catalog } from "@/catalog/types";
import { applyKitchenCommand } from "@/domain/kitchen/commands";
import type { KitchenCommand } from "@/domain/kitchen/commands";
import { WEEK_DAYS } from "@/domain/kitchen/types";
import type { KitchenProfile, KitchenState, MealSlot, WeekDay } from "@/domain/kitchen/types";
import { buildWeekIntelligence } from "@/intelligence";
import type { WeekIntelligence } from "@/intelligence/types";
import { saveKitchen } from "@/storage/kitchen-storage";
import { useStoredKitchen } from "@/storage/use-stored-kitchen";
import { kitchenErrorCopy } from "@/components/app/error-copy";

export type ReadyKitchen = {
  status: "ready";
  catalog: Catalog;
  kitchen: KitchenState;
  intelligence: WeekIntelligence;
  error: string | null;
  /** Apply commands in order; all or nothing. Returns the new state on success. */
  run: (commands: KitchenCommand[]) => KitchenState | null;
  /** Adopt a state produced by a pure projection (closing a week). */
  replace: (state: KitchenState) => void;
};

export type KitchenSession = { status: "loading" } | { status: "empty" } | ReadyKitchen;

let sharedCatalog: Catalog | null = null;

export function useCatalog(): Catalog {
  sharedCatalog ??= loadCatalog();

  return sharedCatalog;
}

/**
 * The household as the screens see it: stored facts in, derived intelligence
 * out. Every change is a domain command whose result is saved straight back,
 * so moving between tabs always reads the same single household.
 */
export function useKitchen(options: { requireKitchen?: boolean } = {}): KitchenSession {
  const { requireKitchen = true } = options;
  const stored = useStoredKitchen();
  const catalog = useCatalog();
  const router = useRouter();
  const [edited, setEdited] = useState<KitchenState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const kitchen = edited ?? (stored.status === "ready" ? stored.kitchen : null);

  const intelligence = useMemo(
    () => (kitchen ? buildWeekIntelligence(kitchen, catalog) : null),
    [kitchen, catalog],
  );

  const empty = stored.status === "ready" && !kitchen;

  useEffect(() => {
    if (empty && requireKitchen) router.replace("/start");
  }, [empty, requireKitchen, router]);

  if (stored.status === "loading") return { status: "loading" };

  if (!kitchen || !intelligence) return { status: "empty" };

  const adopt = (state: KitchenState) => {
    setEdited(state);
    setError(saveKitchen(state) ? null : "This browser would not save your kitchen.");
  };

  return {
    status: "ready",
    catalog,
    kitchen,
    intelligence,
    error,
    run: (commands) => {
      let state = kitchen;

      for (const command of commands) {
        const result = applyKitchenCommand(state, command);

        if (!result.ok) {
          setError(kitchenErrorCopy(result.error));

          return null;
        }

        state = result.state;
      }

      adopt(state);

      return state;
    },
    replace: adopt,
  };
}

/** The browser's weekday, mapped onto the plan's Monday-first week. */
export function todayWeekDay(): WeekDay {
  const index = (new Date().getDay() + 6) % 7;

  return WEEK_DAYS[index] ?? "monday";
}

/** True once this week's basket has been delivered into the pantry. */
export function orderedThisWeek(kitchen: KitchenState): boolean {
  return kitchen.groceryFacts.some((fact) => fact.week === kitchen.week);
}

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

/** The meal a day is remembered by: dinner when planned, else the latest slot. */
export function mainSlot(profile: KitchenProfile): MealSlot {
  return profile.mealSlots.includes("dinner") ? "dinner" : (profile.mealSlots.at(-1) ?? "dinner");
}

export const DAY_SHORT: Record<WeekDay, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export const DAY_LONG: Record<WeekDay, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

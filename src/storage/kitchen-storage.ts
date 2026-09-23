import { kitchenStateSchema } from "@/domain/kitchen/schema";
import type { KitchenState } from "@/domain/kitchen/types";

/**
 * The only effectful boundary in the product: one versioned localStorage slot
 * for the user-built household. Facts only — derived intelligence is never
 * stored. Invalid or outdated values are discarded without crashing.
 */

export const KITCHEN_STORAGE_KEY = "blinkitchen:v1:kitchen";

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/** The single local household uses a stable id. */
export const LOCAL_KITCHEN_ID = "local-kitchen";

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveKitchen(kitchen: KitchenState, storage?: StorageLike): boolean {
  const target = storage ?? defaultStorage();

  if (!target) return false;

  try {
    const parsed = kitchenStateSchema.safeParse(kitchen);

    if (!parsed.success) return false;
    target.setItem(KITCHEN_STORAGE_KEY, JSON.stringify(parsed.data));

    return true;
  } catch {
    return false;
  }
}

/** Load and validate the stored household; discard anything invalid. */
export function loadKitchen(storage?: StorageLike): KitchenState | null {
  const target = storage ?? defaultStorage();

  if (!target) return null;
  let raw: string | null = null;

  try {
    raw = target.getItem(KITCHEN_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const parsed = kitchenStateSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      target.removeItem(KITCHEN_STORAGE_KEY);

      return null;
    }

    return parsed.data;
  } catch {
    try {
      target.removeItem(KITCHEN_STORAGE_KEY);
    } catch {
      // Storage may be unavailable; nothing else to do.
    }

    return null;
  }
}

export function clearKitchen(storage?: StorageLike): void {
  const target = storage ?? defaultStorage();

  if (!target) return;

  try {
    target.removeItem(KITCHEN_STORAGE_KEY);
  } catch {
    // Ignore: reset is best-effort.
  }
}

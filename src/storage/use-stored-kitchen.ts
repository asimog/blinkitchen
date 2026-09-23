"use client";

import { useSyncExternalStore } from "react";
import { loadKitchen, KITCHEN_STORAGE_KEY } from "@/storage/kitchen-storage";
import type { StorageLike } from "@/storage/kitchen-storage";
import type { KitchenState } from "@/domain/kitchen/types";

/**
 * Read the browser-stored household without hydration mismatches.
 *
 * useSyncExternalStore is the React-sanctioned way to read an external store:
 * the server snapshot is null, and the client snapshot is cached by raw value
 * so the returned reference stays stable between renders.
 */

let cachedRaw: string | null = null;

let cachedKitchen: KitchenState | null = null;

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readRaw(): string | null {
  const storage = browserStorage();

  if (!storage) return null;

  try {
    return storage.getItem(KITCHEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): KitchenState | null {
  const raw = readRaw();

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedKitchen = loadKitchen();
  }

  return cachedKitchen;
}

function getServerSnapshot(): KitchenState | null {
  return null;
}

const subscribe = () => () => {
  // The stored kitchen only changes through this app's own actions, which
  // re-render their components; no external subscription is needed.
};

export function useStoredKitchen(): KitchenState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

"use client";

import { useSyncExternalStore } from "react";
import { loadKitchen, KITCHEN_STORAGE_KEY } from "@/storage/kitchen-storage";
import type { StorageLike } from "@/storage/kitchen-storage";
import type { KitchenState } from "@/domain/kitchen/types";

/**
 * Read the browser-stored household without hydration mismatches.
 *
 * `useSyncExternalStore` uses the server snapshot for the hydration render, so
 * the server snapshot is a neutral "loading" state rather than "no household":
 * a returning household must never see the empty state flash before its
 * kitchen paints. The client snapshot is cached by raw value so the returned
 * reference stays stable between renders.
 */

export type StoredKitchen =
  | { status: "loading" }
  | { status: "ready"; kitchen: KitchenState | null };

const LOADING: StoredKitchen = { status: "loading" };

let cachedRaw: string | null = null;

let cachedSnapshot: StoredKitchen = LOADING;

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

function getSnapshot(): StoredKitchen {
  const raw = readRaw();

  if (raw !== cachedRaw || cachedSnapshot.status === "loading") {
    cachedRaw = raw;
    const kitchen = loadKitchen();
    cachedSnapshot = { status: "ready", kitchen };
  }

  return cachedSnapshot;
}

function getServerSnapshot(): StoredKitchen {
  return LOADING;
}

const subscribe = () => () => {
  // The stored kitchen only changes through this app's own actions, which
  // re-render their components; no external subscription is needed.
};

export function useStoredKitchen(): StoredKitchen {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
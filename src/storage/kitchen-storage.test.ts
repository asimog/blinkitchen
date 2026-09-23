import { describe, expect, it } from "vitest";
import {
  clearKitchen,
  KITCHEN_STORAGE_KEY,
  loadKitchen,
  saveKitchen,
} from "@/storage/kitchen-storage";
import type { StorageLike } from "@/storage/kitchen-storage";
import { makeKitchen, pantryItem } from "@/test-utils/kitchen";

class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  raw(key: string): string | undefined {
    return this.map.get(key);
  }
}

describe("kitchen storage", () => {
  it("round-trips a valid kitchen", () => {
    const storage = new MemoryStorage();
    const kitchen = makeKitchen({}, {}, [pantryItem("onion", 500, "g", { useSoon: true })]);
    expect(saveKitchen(kitchen, storage)).toBe(true);
    expect(loadKitchen(storage)).toEqual(kitchen);
  });

  it("returns null when nothing is stored", () => {
    expect(loadKitchen(new MemoryStorage())).toBeNull();
  });

  it("discards malformed JSON and removes the key", () => {
    const storage = new MemoryStorage();
    storage.setItem(KITCHEN_STORAGE_KEY, "{not json");
    expect(loadKitchen(storage)).toBeNull();
    expect(storage.raw(KITCHEN_STORAGE_KEY)).toBeUndefined();
  });

  it("discards schema-invalid state and removes the key", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      KITCHEN_STORAGE_KEY,
      JSON.stringify({ id: "x", profile: {}, week: 99, pantry: [] }),
    );
    expect(loadKitchen(storage)).toBeNull();
    expect(storage.raw(KITCHEN_STORAGE_KEY)).toBeUndefined();
  });

  it("refuses to save state that would fail validation", () => {
    const storage = new MemoryStorage();
    const invalid = { ...makeKitchen(), week: 42 } as ReturnType<typeof makeKitchen>;
    expect(saveKitchen(invalid, storage)).toBe(false);
    expect(storage.raw(KITCHEN_STORAGE_KEY)).toBeUndefined();
  });

  it("clears the stored household", () => {
    const storage = new MemoryStorage();
    saveKitchen(makeKitchen(), storage);
    clearKitchen(storage);
    expect(loadKitchen(storage)).toBeNull();
  });

  it("survives storage that throws", () => {
    const hostile: StorageLike = {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
      removeItem() {
        throw new Error("denied");
      },
    };
    expect(loadKitchen(hostile)).toBeNull();
    expect(saveKitchen(makeKitchen(), hostile)).toBe(false);
    expect(() => clearKitchen(hostile)).not.toThrow();
  });

  it("persists no derived intelligence", () => {
    const storage = new MemoryStorage();
    const kitchen = makeKitchen();
    saveKitchen(kitchen, storage);
    const raw = storage.raw(KITCHEN_STORAGE_KEY) ?? "";
    for (const forbidden of ["recommend", "basket", "coverage", "score", "learning"]) {
      expect(raw.toLowerCase()).not.toContain(forbidden);
    }
  });
});

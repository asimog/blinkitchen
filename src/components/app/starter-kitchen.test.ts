import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { ingredientById } from "@/catalog/grocery-graph";
import { kitchenProfileSchema, kitchenStateSchema, pantryItemSchema } from "@/domain/kitchen/schema";
import { makeKitchen } from "@/test-utils/kitchen";
import {
  pantryItemsFromQuickPicks,
  quickPickGroups,
  everydayMasalas,
  starterProfile,
  typicalPack,
} from "@/components/app/starter-kitchen";

const catalog = loadCatalog();

const locationId = catalog.locations[0]?.id ?? "";

function chosenQuickPickIds(): string[] {
  const ids: string[] = [];

  for (const group of quickPickGroups(catalog)) {
    for (const ingredient of group.ingredients.slice(0, 2)) {
      ids.push(ingredient.id);
    }
  }

  return ids;
}

describe("onboarding-prefs", () => {
  it("builds a schema-valid profile from three answers", () => {
    for (const diet of ["vegetarian", "non_vegetarian"] as const) {
      const profile = starterProfile(3, diet, locationId);
      expect(kitchenProfileSchema.safeParse(profile).success).toBe(true);
      expect(profile).toMatchObject({ memberCount: 3, diet, cookingDaysPerWeek: 7 });
    }
  });

  it("is deterministic for the same picks", () => {
    const picks = chosenQuickPickIds();

    expect(pantryItemsFromQuickPicks(catalog, picks, locationId)).toEqual(
      pantryItemsFromQuickPicks(catalog, [...picks], locationId),
    );
  });

  it("turns every chosen quick pick into one schema-valid pantry row", () => {
    const picks = chosenQuickPickIds();
    const rows = pantryItemsFromQuickPicks(catalog, picks, locationId);

    expect(rows).toHaveLength(picks.length);

    for (const row of rows) {
      const pack = typicalPack(catalog, row.ingredientId, locationId);

      expect(pack).toBeDefined();
      expect(row.quantity).toBe(pack?.quantity);
      expect(row.unit).toBe(pack?.unit);
      expect(row.quantity).toBeGreaterThan(0);
      expect(pantryItemSchema.safeParse(row).success).toBe(true);
    }

    expect(kitchenStateSchema.safeParse(makeKitchen({}, {}, rows)).success).toBe(true);
  });

  it("never invents a pack: every quick-pick ingredient is purchasable everywhere", () => {
    for (const group of quickPickGroups(catalog)) {
      for (const ingredient of group.ingredients) {
        expect(ingredientById(catalog, ingredient.id)).toBeDefined();

        for (const location of catalog.locations) {
          expect(typicalPack(catalog, ingredient.id, location.id)).toBeDefined();
        }
      }
    }
  });

  it("stocks everyday masalas as one tap, all purchasable spices", () => {
    const masalas = everydayMasalas(catalog, locationId);

    expect(masalas.length).toBeGreaterThan(3);
    expect(masalas.every((spice) => spice.category === "spice")).toBe(true);
    expect(pantryItemsFromQuickPicks(catalog, masalas.map((spice) => spice.id), locationId)).toHaveLength(
      masalas.length,
    );
  });
});

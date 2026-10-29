import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { kitchenProfileSchema, kitchenStateSchema, pantryItemSchema } from "@/domain/kitchen/schema";
import { makeKitchen } from "@/test-utils/kitchen";
import {
  everydayMasalas,
  needsHomeCheck,
  startingPantryItems,
  starterProfile,
  typicalPack,
  usualStaples,
  withStartingPantry,
} from "@/components/app/starter-kitchen";

const catalog = loadCatalog();

const locationId = catalog.locations[0]?.id ?? "";

describe("starter kitchen", () => {
  it("builds a schema-valid profile from three answers", () => {
    for (const diet of ["vegetarian", "non_vegetarian"] as const) {
      const profile = starterProfile(3, diet, ["breakfast", "dinner"], locationId);
      expect(kitchenProfileSchema.safeParse(profile).success).toBe(true);
      expect(profile).toMatchObject({ memberCount: 3, diet, cookingDaysPerWeek: 7, mealSlots: ["breakfast", "dinner"] });
    }
  });

  it("assumes only shelf-stable staples and masalas for the usual stuff", () => {
    const usual = usualStaples(catalog, locationId);
    const ids = usual.map((ingredient) => ingredient.id);

    expect(ids).toEqual(expect.arrayContaining(["rice", "atta", "oil", "salt"]));
    expect(ids).not.toContain("milk");
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(everydayMasalas(catalog, locationId).map((spice) => spice.id)));
  });

  it("turns every ingredient at home into one schema-valid pantry row", () => {
    const ids = usualStaples(catalog, locationId).map((ingredient) => ingredient.id);
    const rows = startingPantryItems(catalog, [...ids, ...ids], locationId);

    expect(rows).toHaveLength(ids.length);

    for (const row of rows) {
      const pack = typicalPack(catalog, row.ingredientId, locationId);

      expect(row.quantity).toBe(pack?.quantity);
      expect(row.unit).toBe(pack?.unit);
      expect(pantryItemSchema.safeParse(row).success).toBe(true);
    }

    expect(kitchenStateSchema.safeParse(makeKitchen({}, {}, rows)).success).toBe(true);
  });

  it("asks what is at home once, before anything is stocked or bought", () => {
    const fresh = makeKitchen();
    expect(needsHomeCheck(fresh)).toBe(true);

    const stocked = withStartingPantry(fresh, startingPantryItems(catalog, ["rice"], locationId));
    expect(stocked?.pantry.map((item) => item.ingredientId)).toEqual(["rice"]);
    expect(stocked && needsHomeCheck(stocked)).toBe(false);
    expect(stocked && withStartingPantry(stocked, [])).toBeNull();
  });
});

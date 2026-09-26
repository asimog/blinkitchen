import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/catalog/load";
import { ingredientById } from "@/catalog/grocery-graph";
import { kitchenProfileSchema, kitchenStateSchema, pantryItemSchema } from "@/domain/kitchen/schema";
import { makeKitchen, testProfile } from "@/test-utils/kitchen";
import {
  COOKING_FREQUENCY_OPTIONS,
  DIET_OPTIONS,
  PRIORITY_CHIPS,
  cookingDaysForFrequency,
  pantryItemsFromQuickPicks,
  preferencesFromPriorities,
  quickPickGroups,
  typicalPack,
} from "@/components/onboarding/onboarding-prefs";

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
  it("keeps only vegetarian and vegan diets on offer", () => {
    expect(DIET_OPTIONS.map((option) => option.id)).toEqual(["vegetarian", "vegan"]);
  });

  it("maps each priority chip to exactly its intended profile field", () => {
    for (const chip of PRIORITY_CHIPS) {
      const values = preferencesFromPriorities([chip.id]);
      const raised = Object.entries(values).filter(([, value]) => value !== 0.5);

      expect(raised).toEqual([[chip.field, 0.8]]);
    }
  });

  it("names the chip-to-field mapping explicitly", () => {
    expect(preferencesFromPriorities(["use_what_i_have"]).planningPreference).toBe(0.8);
    expect(preferencesFromPriorities(["save_money"]).priceSensitivity).toBe(0.8);
    expect(preferencesFromPriorities(["cook_quickly"]).conveniencePreference).toBe(0.8);
    expect(preferencesFromPriorities(["try_new_dishes"]).explorationPreference).toBe(0.8);
  });

  it("keeps every unpicked preference neutral", () => {
    expect(preferencesFromPriorities([])).toEqual({
      planningPreference: 0.5,
      priceSensitivity: 0.5,
      conveniencePreference: 0.5,
      explorationPreference: 0.5,
    });
  });

  it("is deterministic for the same priorities and picks", () => {
    const priorities = ["use_what_i_have", "cook_quickly"] as const;
    const picks = chosenQuickPickIds();

    expect(preferencesFromPriorities(priorities)).toEqual(preferencesFromPriorities([...priorities]));
    expect(pantryItemsFromQuickPicks(catalog, picks, locationId)).toEqual(
      pantryItemsFromQuickPicks(catalog, [...picks], locationId),
    );
  });

  it("produces schema-valid profile preferences", () => {
    const profile = {
      ...testProfile,
      ...preferencesFromPriorities(["save_money", "try_new_dishes"]),
    };

    expect(kitchenProfileSchema.safeParse(profile).success).toBe(true);
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

  it("keeps cooking frequency options inside the profile range", () => {
    for (const option of COOKING_FREQUENCY_OPTIONS) {
      expect(option.days).toBeGreaterThanOrEqual(0);
      expect(option.days).toBeLessThanOrEqual(7);
      expect(cookingDaysForFrequency(option.id)).toBe(option.days);
      expect(
        kitchenProfileSchema.safeParse({ ...testProfile, cookingDaysPerWeek: option.days }).success,
      ).toBe(true);
    }
  });
});

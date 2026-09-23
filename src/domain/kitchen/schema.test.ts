import { describe, expect, it } from "vitest";
import { kitchenStateSchema } from "@/domain/kitchen/schema";
import { makeKitchen, pantryItem } from "@/test-utils/kitchen";

describe("kitchenStateSchema", () => {
  it("accepts a valid kitchen state", () => {
    const state = makeKitchen({}, {}, [pantryItem("onion", 500, "g")]);
    expect(kitchenStateSchema.safeParse(state).success).toBe(true);
  });

  it("rejects weeks outside 1..8", () => {
    const state = makeKitchen();
    expect(kitchenStateSchema.safeParse({ ...state, week: 0 }).success).toBe(false);
    expect(kitchenStateSchema.safeParse({ ...state, week: 9 }).success).toBe(false);
  });

  it("rejects negative or zero pantry quantities", () => {
    const state = makeKitchen();
    expect(
      kitchenStateSchema.safeParse({
        ...state,
        pantry: [{ ...pantryItem("onion", 1, "g"), quantity: -5 }],
      }).success,
    ).toBe(false);
    expect(
      kitchenStateSchema.safeParse({
        ...state,
        pantry: [{ ...pantryItem("onion", 1, "g"), quantity: 0 }],
      }).success,
    ).toBe(false);
  });

  it("rejects unsupported units and unknown keys", () => {
    const state = makeKitchen();
    expect(
      kitchenStateSchema.safeParse({
        ...state,
        pantry: [{ ...pantryItem("onion", 1, "g"), unit: "dozen" }],
      }).success,
    ).toBe(false);
    expect(kitchenStateSchema.safeParse({ ...state, extra: true }).success).toBe(false);
  });

  it("rejects duplicate pantry rows for the same ingredient", () => {
    const state = makeKitchen({}, {}, [pantryItem("onion", 100, "g"), pantryItem("onion", 2, "piece")]);
    expect(kitchenStateSchema.safeParse(state).success).toBe(false);
  });

  it("enforces fresh kitchen and starter-essential rules", () => {
    const freshWithPantry = makeKitchen({}, { kitchenType: "fresh" }, [pantryItem("onion", 100, "g")]);
    expect(kitchenStateSchema.safeParse(freshWithPantry).success).toBe(false);

    const freshEmpty = makeKitchen(
      {},
      { kitchenType: "fresh", starterIngredientIds: ["rice", "oil"] },
      [],
    );

    expect(kitchenStateSchema.safeParse(freshEmpty).success).toBe(true);

    const existingWithStarters = makeKitchen({}, { kitchenType: "existing", starterIngredientIds: ["rice"] });
    expect(kitchenStateSchema.safeParse(existingWithStarters).success).toBe(false);
  });

  it("rejects preferences outside 0..1 and invalid profiles", () => {
    const state = makeKitchen();
    expect(
      kitchenStateSchema.safeParse({
        ...state,
        profile: { ...state.profile, planningPreference: 1.4 },
      }).success,
    ).toBe(false);
    expect(
      kitchenStateSchema.safeParse({
        ...state,
        profile: { ...state.profile, cuisines: [] },
      }).success,
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { applyKitchenCommand } from "@/domain/kitchen/commands";
import { choicesForWeek, isJourneyComplete, pantryQuantity } from "@/domain/kitchen/state";
import { makeKitchen, pantryItem } from "@/test-utils/kitchen";

function expectOk(result: ReturnType<typeof applyKitchenCommand>) {
  if (!result.ok) throw new Error(`Expected ok, got ${result.error.code}: ${result.error.message}`);
  return result.state;
}

function expectErr(result: ReturnType<typeof applyKitchenCommand>) {
  if (result.ok) throw new Error("Expected failure");
  return result.error;
}

describe("receive_grocery", () => {
  it("records facts and merges stock, converting compatible units", () => {
    const state = makeKitchen({}, {}, [pantryItem("onion", 500, "g")]);
    const next = expectOk(
      applyKitchenCommand(state, {
        type: "receive_grocery",
        lines: [
          { ingredientId: "onion", quantity: 1, unit: "kg" },
          { ingredientId: "rice", quantity: 500, unit: "g" },
        ],
      }),
    );
    expect(pantryQuantity(next, "onion", "g")).toBe(1500);
    expect(pantryQuantity(next, "rice", "g")).toBe(500);
    expect(next.groceryFacts).toHaveLength(2);
    expect(next.groceryFacts[0]?.quantity).toBe(1000);
    expect(next.groceryFacts[0]?.unit).toBe("g");
    expect(next.pantry.find((item) => item.ingredientId === "rice")?.acquiredWeek).toBe(1);
  });

  it("keeps incompatible units as separate rows", () => {
    const state = makeKitchen({}, {}, [pantryItem("lemon", 4, "piece")]);
    const next = expectOk(
      applyKitchenCommand(state, {
        type: "receive_grocery",
        lines: [{ ingredientId: "lemon", quantity: 200, unit: "g" }],
      }),
    );
    expect(next.pantry.filter((item) => item.ingredientId === "lemon")).toHaveLength(2);
  });

  it("rejects empty and invalid lines", () => {
    const state = makeKitchen();
    expect(expectErr(applyKitchenCommand(state, { type: "receive_grocery", lines: [] })).code).toBe(
      "invalid_command",
    );
    expect(
      expectErr(
        applyKitchenCommand(state, {
          type: "receive_grocery",
          lines: [{ ingredientId: "rice", quantity: -5, unit: "g" }],
        }),
      ).code,
    ).toBe("invalid_quantity");
  });
});

describe("consume and waste", () => {
  it("decrements stock, removes empty rows and records facts", () => {
    const state = makeKitchen({}, {}, [
      pantryItem("onion", 1, "kg"),
      pantryItem("rice", 500, "g"),
    ]);
    const next = expectOk(
      applyKitchenCommand(state, {
        type: "consume_ingredient",
        ingredientId: "onion",
        quantity: 250,
        unit: "g",
      }),
    );
    expect(pantryQuantity(next, "onion", "g")).toBe(750);
    expect(next.consumptionFacts[0]?.kind).toBe("used");

    const emptied = expectOk(
      applyKitchenCommand(next, {
        type: "consume_ingredient",
        ingredientId: "rice",
        quantity: 500,
        unit: "g",
      }),
    );
    expect(emptied.pantry.some((item) => item.ingredientId === "rice")).toBe(false);
  });

  it("consumes use-soon stock first", () => {
    const state = makeKitchen({}, {}, [
      pantryItem("spinach", 200, "g", { acquiredWeek: 2 }),
      pantryItem("spinach", 100, "g", { useSoon: true, acquiredWeek: 1 }),
    ]);
    const next = expectOk(
      applyKitchenCommand(state, {
        type: "consume_ingredient",
        ingredientId: "spinach",
        quantity: 80,
        unit: "g",
      }),
    );
    const rows = next.pantry.filter((item) => item.ingredientId === "spinach");
    expect(rows.find((item) => item.useSoon)?.quantity).toBe(20);
    expect(rows.find((item) => !item.useSoon)?.quantity).toBe(200);
  });

  it("never allows stock to go negative", () => {
    const state = makeKitchen({}, {}, [pantryItem("paneer", 200, "g")]);
    const error = expectErr(
      applyKitchenCommand(state, {
        type: "consume_ingredient",
        ingredientId: "paneer",
        quantity: 201,
        unit: "g",
      }),
    );
    expect(error.code).toBe("insufficient_stock");
    expect(pantryQuantity(state, "paneer", "g")).toBe(200);
  });

  it("reports missing stock and unit mismatches distinctly", () => {
    const empty = makeKitchen();
    expect(
      expectErr(
        applyKitchenCommand(empty, {
          type: "consume_ingredient",
          ingredientId: "paneer",
          quantity: 100,
          unit: "g",
        }),
      ).code,
    ).toBe("insufficient_stock");

    const pieces = makeKitchen({}, {}, [pantryItem("paneer", 2, "piece")]);
    expect(
      expectErr(
        applyKitchenCommand(pieces, {
          type: "consume_ingredient",
          ingredientId: "paneer",
          quantity: 100,
          unit: "g",
        }),
      ).code,
    ).toBe("unit_mismatch");
  });

  it("records waste separately from use", () => {
    const state = makeKitchen({}, {}, [pantryItem("spinach", 300, "g", { useSoon: true })]);
    const next = expectOk(
      applyKitchenCommand(state, {
        type: "waste_ingredient",
        ingredientId: "spinach",
        quantity: 300,
        unit: "g",
      }),
    );
    expect(next.consumptionFacts[0]?.kind).toBe("wasted");
    expect(pantryQuantity(next, "spinach", "g")).toBe(0);
  });
});

describe("weekly choices", () => {
  it("stores selected meals, rejecting duplicates and oversized plans", () => {
    const state = makeKitchen();
    const next = expectOk(
      applyKitchenCommand(state, { type: "select_meals", recipeIds: ["rajma_chawal", "chole"] }),
    );
    expect(choicesForWeek(next, 1).selectedRecipeIds).toEqual(["rajma_chawal", "chole"]);

    expect(
      expectErr(
        applyKitchenCommand(next, { type: "select_meals", recipeIds: ["dal", "dal"] }),
      ).code,
    ).toBe("duplicate_selection");

    expect(
      expectErr(
        applyKitchenCommand(next, {
          type: "select_meals",
          recipeIds: ["a", "b", "c", "d", "e", "f", "g", "h"],
        }),
      ).code,
    ).toBe("too_many_meals");
  });

  it("records substitution decisions once and allows changing the mind", () => {
    const state = makeKitchen();
    const accepted = expectOk(
      applyKitchenCommand(state, {
        type: "decide_substitution",
        substitutionId: "paneer_to_tofu",
        accepted: true,
      }),
    );
    expect(choicesForWeek(accepted, 1).substitutionDecisions).toEqual([
      { substitutionId: "paneer_to_tofu", accepted: true },
    ]);

    const unchanged = expectOk(
      applyKitchenCommand(accepted, {
        type: "decide_substitution",
        substitutionId: "paneer_to_tofu",
        accepted: true,
      }),
    );
    expect(unchanged).toBe(accepted);

    const rejected = expectOk(
      applyKitchenCommand(accepted, {
        type: "decide_substitution",
        substitutionId: "paneer_to_tofu",
        accepted: false,
      }),
    );
    expect(choicesForWeek(rejected, 1).substitutionDecisions).toEqual([
      { substitutionId: "paneer_to_tofu", accepted: false },
    ]);
  });

  it("completes a meal at most once per week", () => {
    const state = makeKitchen();
    const next = expectOk(
      applyKitchenCommand(state, { type: "complete_meal", recipeId: "rajma_chawal" }),
    );
    expect(next.mealFacts).toHaveLength(1);
    expect(
      expectErr(
        applyKitchenCommand(next, { type: "complete_meal", recipeId: "rajma_chawal" }),
      ).code,
    ).toBe("meal_already_completed");
  });
});

describe("week advancement", () => {
  it("completes the week and advances", () => {
    const state = makeKitchen();
    const next = expectOk(applyKitchenCommand(state, { type: "complete_week" }));
    expect(next.week).toBe(2);
    expect(choicesForWeek(next, 1).completed).toBe(true);
  });

  it("refuses to complete a week that is already marked complete", () => {
    const state = makeKitchen({
      weeklyChoices: [
        {
          week: 1,
          selectedRecipeIds: [],
          skippedRecipeIds: [],
          substitutionDecisions: [],
          completed: true,
        },
      ],
    });
    expect(expectErr(applyKitchenCommand(state, { type: "complete_week" })).code).toBe(
      "week_already_completed",
    );
  });

  it("stays within weeks 1..8 and terminates at week 8", () => {
    let state = makeKitchen();
    for (let week = 1; week <= 8; week += 1) {
      expect(state.week).toBe(week);
      state = expectOk(applyKitchenCommand(state, { type: "complete_week" }));
    }
    expect(state.week).toBe(8);
    expect(isJourneyComplete(state)).toBe(true);

    const rejected = applyKitchenCommand(state, {
      type: "receive_grocery",
      lines: [{ ingredientId: "rice", quantity: 1, unit: "kg" }],
    });
    expect(expectErr(rejected).code).toBe("journey_complete");
  });
});

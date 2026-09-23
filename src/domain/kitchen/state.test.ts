import { describe, expect, it } from "vitest";
import { pantryQuantity } from "@/domain/kitchen/state";
import { makeKitchen, pantryItem } from "@/test-utils/kitchen";

describe("pantryQuantity unit precision", () => {
  it("returns canonical quantities rounded to 2 decimals", () => {
    const kitchen = makeKitchen({}, {}, [pantryItem("onion", 1, "kg"), pantryItem("rice", 250, "g")]);
    expect(pantryQuantity(kitchen, "onion", "g")).toBe(1000);
    expect(pantryQuantity(kitchen, "rice", "g")).toBe(250);
  });

  it("does not quantize kg answers to 10 g steps", () => {
    const kitchen = makeKitchen({}, {}, [pantryItem("onion", 1001, "g")]);
    // Rounding the kg answer to 2 decimals would report 1, losing a gram.
    expect(pantryQuantity(kitchen, "onion", "kg")).toBeCloseTo(1.001, 10);
    expect(pantryQuantity(kitchen, "onion", "g")).toBe(1001);
  });

  it("never sums incompatible units", () => {
    const kitchen = makeKitchen({}, {}, [pantryItem("paneer", 2, "piece")]);
    expect(pantryQuantity(kitchen, "paneer", "piece")).toBe(2);
    expect(pantryQuantity(kitchen, "paneer", "g")).toBe(0);
  });
});

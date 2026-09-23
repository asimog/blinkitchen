import { describe, expect, it } from "vitest";
import { compareStrings } from "@/domain/order";

describe("compareStrings", () => {
  it("orders by code unit, independent of locale", () => {
    expect(compareStrings("a", "b")).toBe(-1);
    expect(compareStrings("b", "a")).toBe(1);
    expect(compareStrings("a", "a")).toBe(0);
  });

  it("orders punctuation by code unit, not by collation rules", () => {
    // Locale-aware collation may ignore or reorder punctuation; code-unit
    // comparison must not.
    expect(compareStrings("rajma_chawal", "rajma-chawal")).toBeGreaterThan(0);
    expect(compareStrings("Atta (Whole Wheat Flour)", "Atta Wheat")).toBeLessThan(0);
    expect(compareStrings("Zucchini", "apple")).toBeLessThan(0);
  });

  it("is a total order usable as a sort comparator", () => {
    const input = ["beta", "Alpha", "beta_2", "alpha-1", ""];
    const sorted = [...input].sort(compareStrings);
    expect(sorted).toEqual(["", "Alpha", "alpha-1", "beta", "beta_2"]);
    expect([...sorted].sort(compareStrings)).toEqual(sorted);
  });
});

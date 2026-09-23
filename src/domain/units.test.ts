import { describe, expect, it } from "vitest";
import { normalizeQuantity, convertQuantity, formatQuantity, unitsCompatible, roundQuantity } from "@/domain/units";

describe("normalizeQuantity", () => {
  it("converts kg to g and l to ml", () => {
    expect(normalizeQuantity(1.5, "kg")).toEqual({ quantity: 1500, unit: "g" });
    expect(normalizeQuantity(2, "l")).toEqual({ quantity: 2000, unit: "ml" });
  });

  it("leaves canonical units untouched", () => {
    expect(normalizeQuantity(250, "g")).toEqual({ quantity: 250, unit: "g" });
    expect(normalizeQuantity(3, "piece")).toEqual({ quantity: 3, unit: "piece" });
    expect(normalizeQuantity(2, "packet")).toEqual({ quantity: 2, unit: "packet" });
  });

  it("rounds to two decimal places", () => {
    expect(normalizeQuantity(0.145, "kg").quantity).toBe(145);
    expect(roundQuantity(0.1 + 0.2)).toBe(0.3);
  });

  it("rejects negative and non-finite quantities", () => {
    expect(() => normalizeQuantity(-1, "g")).toThrow(RangeError);
    expect(() => normalizeQuantity(Number.NaN, "g")).toThrow(RangeError);
    expect(() => normalizeQuantity(Number.POSITIVE_INFINITY, "g")).toThrow(RangeError);
  });
});

describe("convertQuantity", () => {
  it("converts within a dimension", () => {
    expect(convertQuantity(500, "g", "kg")).toBe(0.5);
    expect(convertQuantity(1.5, "kg", "g")).toBe(1500);
    expect(convertQuantity(750, "ml", "l")).toBe(0.75);
  });

  it("never infers cross-dimension conversion", () => {
    expect(convertQuantity(2, "piece", "g")).toBeNull();
    expect(convertQuantity(1, "kg", "ml")).toBeNull();
    expect(convertQuantity(1, "packet", "piece")).toBeNull();
  });

  it("reports compatibility by dimension", () => {
    expect(unitsCompatible("kg", "g")).toBe(true);
    expect(unitsCompatible("ml", "l")).toBe(true);
    expect(unitsCompatible("g", "ml")).toBe(false);
    expect(unitsCompatible("piece", "packet")).toBe(false);
  });
});

describe("formatQuantity", () => {
  it("scales large canonical quantities for display", () => {
    expect(formatQuantity(180, "g")).toBe("180 g");
    expect(formatQuantity(1500, "g")).toBe("1.5 kg");
    expect(formatQuantity(2000, "ml")).toBe("2 l");
    expect(formatQuantity(4, "piece")).toBe("4 piece");
  });
});

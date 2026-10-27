import { describe, expect, it } from "vitest";
import { dishName } from "@/components/app/food";

describe("dishName", () => {
  it("capitalises lowercase harvested names and leaves styled names alone", () => {
    expect(dishName("tamarind rice (puliyogare)")).toBe("Tamarind Rice (Puliyogare)");
    expect(dishName("Pesara vadalu")).toBe("Pesara vadalu");
  });
});

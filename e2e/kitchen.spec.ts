import { expect, test } from "@playwright/test";
import { checkOutUsual, startKitchen } from "./helpers";

test.describe("the kitchen loop", () => {
  test("onboarding asks about people, diet and meals, never the pantry", async ({ page }) => {
    await page.goto("/start");
    await expect(page.getByText("1 of 3")).toBeVisible();
    await page.getByRole("button", { name: "7+" }).click();
    await page.getByRole("button", { name: "More people" }).click();
    await page.getByRole("button", { name: "9 people" }).click();
    await expect(page.getByRole("heading", { name: "How do you eat?" })).toBeVisible();
    await page.getByRole("button", { name: "Non-veg", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Which meals?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dinner" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Breakfast" }).click();
    await page.getByRole("button", { name: /Pick my meals/ }).click();
    await expect(page.getByText("0 of 14 meals")).toBeVisible();
    await expect(page.getByText("Mon · Breakfast")).toBeVisible();
  });

  test("swipe, skip a day, fill, say what's home, check out", async ({ page }) => {
    await startKitchen(page);
    await expect(page.getByText("Swipe to add")).toBeVisible();
    await page.getByRole("button", { name: "Add to Mon" }).click();
    await expect(page.getByText("1 of 7 meals")).toBeVisible();

    await page.getByRole("button", { name: /^Pass on / }).click();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("2 of 7 meals")).toBeVisible();

    await page.getByRole("button", { name: "Skip Wed" }).click();
    await expect(page.getByText("2 of 6 meals")).toBeVisible();
    await page.getByRole("button", { name: "Fill the rest for me" }).click();
    await expect(page.getByText("6 of 6 meals")).toBeVisible();

    await checkOutUsual(page);
    await expect(page.getByRole("heading", { name: "What's cooking?" })).toBeVisible();

    await page.getByRole("link", { name: "Pantry" }).click();
    await expect(page.getByRole("heading", { name: "Pantry" })).toBeVisible();
    await expect(page.getByText("Coming up")).toBeVisible();
  });

  test("the perfectionist ticks only this week's ingredients", async ({ page }) => {
    await startKitchen(page);
    await page.getByRole("button", { name: "Fill the rest for me" }).click();
    await page.getByRole("link", { name: /what's at home/ }).click();
    await page.getByRole("button", { name: /The perfectionist/ }).click();
    await page.getByRole("button", { name: "Salt", exact: true }).click();
    await page.getByRole("button", { name: "1 at home" }).click();
    await expect(page.getByRole("heading", { name: "Your basket" })).toBeVisible();
    await expect(page.getByText(/1 items already home/)).toBeVisible();
  });

  test("wrapping up a week counts meals as cooked and remixes the next", async ({ page }) => {
    await startKitchen(page);
    await page.getByRole("button", { name: "Fill the rest for me" }).click();
    await checkOutUsual(page);
    await page.getByRole("link", { name: "Week", exact: true }).click();
    await page.getByRole("button", { name: "Wrap up week 1" }).click();

    await expect(page).toHaveURL(/\/remix$/);
    await expect(page.getByText("Week 2, remixed")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("Week 2 of 8")).toBeVisible();

    await page.getByRole("link", { name: "Kitchen" }).click();
    await expect(page.getByText("Weeks 2–8 are projected from how you cook.")).toBeVisible();
    await page.getByRole("button", { name: "Blinkit lens" }).click();
    await expect(page.getByText(/Not customer data/)).toBeVisible();
  });

  test("a lived-in sample kitchen opens straight on today", async ({ page }) => {
    await page.goto("/start");
    await page.getByRole("button", { name: "Or peek into a lived-in kitchen" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/Week 4 ·/)).toBeVisible();
  });

  test("start over erases the household", async ({ page }) => {
    await startKitchen(page);
    await page.getByRole("link", { name: "Kitchen" }).click();
    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Tap again to erase this kitchen" }).click();
    await expect(page).toHaveURL(/\/start$/);
  });
});

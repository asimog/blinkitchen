import { expect, test } from "@playwright/test";
import { startKitchen } from "./helpers";

test.describe("the kitchen loop", () => {
  test("onboarding asks three things and nothing else", async ({ page }) => {
    await page.goto("/start");
    await expect(page.getByText("1 of 3")).toBeVisible();
    await page.getByRole("button", { name: "2", exact: true }).click();
    await expect(page.getByRole("heading", { name: "How do you eat?" })).toBeVisible();
    await page.getByRole("button", { name: "Non-veg", exact: true }).click();
    await expect(page.getByRole("heading", { name: "What's in your kitchen?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Masalas" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("textbox")).toHaveCount(0);
  });

  test("swipe, fill, check out, then see today and the pantry", async ({ page }) => {
    await startKitchen(page);
    await page.getByRole("button", { name: "Add to Mon" }).click();
    await expect(page.getByText("1 of 7 dinners")).toBeVisible();

    const skipped = page.getByRole("button", { name: /^Not / });
    await skipped.click();
    await page.getByRole("button", { name: "Fill the rest for me" }).click();
    await expect(page.getByText("7 of 7 dinners")).toBeVisible();

    await page.getByRole("link", { name: /^Get \d+ items/ }).click();
    await expect(page.getByRole("heading", { name: "Your basket" })).toBeVisible();
    await expect(page.getByText("Nothing is ordered.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: /Place order/ }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "What's cooking?" })).toBeVisible();
    await expect(page.getByText("All at home")).toBeVisible();

    await page.getByRole("link", { name: "Pantry" }).click();
    await expect(page.getByRole("heading", { name: "Pantry" })).toBeVisible();
    await expect(page.getByText("Coming up")).toBeVisible();
  });

  test("wrapping up a week counts meals as cooked and remixes the next", async ({ page }) => {
    await startKitchen(page);
    await page.getByRole("button", { name: "Fill the rest for me" }).click();
    await page.getByRole("link", { name: /^Get \d+ items/ }).click();
    await page.getByRole("button", { name: /Place order/ }).click();
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

import { expect, test } from "@playwright/test";

test.describe("mobile smoke", () => {
  test("home, explore and week advance work at 390px", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /remembers the kitchen/i })).toBeVisible();

    await page.goto("/explore/value_optimizer");
    await expect(page.getByText("Week 1 of 8", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Advance one week/i }).click();
    await expect(page.getByText("Week 2 of 8", { exact: true })).toBeVisible();

    await page.goto("/blinkit");
    await expect(page.getByText(/SIMULATED DATA/)).toBeVisible();
  });

  test("long panels are readable at 390px: stacked basket, collapsed recorder", async ({
    page,
  }) => {
    await page.goto("/explore/value_optimizer");
    await expect(page.getByText("Week 1 of 8", { exact: true })).toBeVisible();
    // Basket: the six-column table gives way to stacked lines on small screens.
    const basket = page.getByLabel("Pantry-aware basket");
    await expect(basket.locator("table")).toBeHidden();
    await expect(basket.locator("li").first()).toBeVisible();

    // Archetype comparison becomes cards instead of a scrolling table.
    await page.goto("/blinkit");
    const comparison = page.getByLabel("Archetype comparison");
    await expect(comparison.locator("table")).toBeHidden();
    await expect(comparison.getByRole("heading", { name: "The Mehtas" })).toBeVisible();
  });
});

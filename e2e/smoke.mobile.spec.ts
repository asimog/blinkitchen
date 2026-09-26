import { expect, test } from "@playwright/test";

test.describe("mobile smoke", () => {
  test("home, explore and week advance work at 390px", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Your kitchen.*possibility/i })).toBeVisible();

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
    const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(width.content).toBeLessThanOrEqual(width.viewport);
    // Shopping details are revealed deliberately and use readable stacked lines.
    const basket = page.getByLabel("Pantry-aware basket");
    await basket.getByText("Review basket", { exact: false }).click();
    await expect(basket.locator("li").first()).toBeVisible();

    // Archetype comparison becomes cards instead of a scrolling table.
    await page.goto("/blinkit");
    await page.getByText("Explore the cohort data · 4 households, 8 weeks").click();
    const comparison = page.getByLabel("Archetype comparison");
    await expect(comparison.locator("table")).toBeHidden();
    await expect(comparison.getByRole("heading", { name: "The Mehtas" })).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";
import { completeWizard } from "./helpers";

test.describe("home to kitchen", () => {
  test("home explains the product and links to every surface", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /remembers the kitchen/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Build your household/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Explore four households/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /View Blinkit intelligence/i })).toBeVisible();
  });

  test("build household then run the Week 1 loop", async ({ page }) => {
    await completeWizard(page, "E2E Kitchen");
    await expect(page.getByText("What you already have")).toBeVisible();
    await expect(page.getByLabel("Your week, step by step")).toBeVisible();

    await page.getByRole("button", { name: /Receive basket/i }).first().click();
    await page.getByRole("button", { name: /Cook \d+ planned meals/i }).click();
    await page.getByRole("button", { name: /Complete week 1/i }).click();
    await expect(page.getByText("Week 2 of 8", { exact: true })).toBeVisible();
  });

  test("reset prototype clears the stored household", async ({ page }) => {
    await completeWizard(page, "E2E Reset");
    await page.getByRole("button", { name: "Reset prototype" }).click();
    await page.getByRole("button", { name: /Tap again to erase/i }).click();
    await expect(
      page.getByRole("heading", { name: /No household in this browser yet/i }),
    ).toBeVisible();
    const stored = await page.evaluate(() => window.localStorage.getItem("blinkitchen:v1:kitchen"));
    expect(stored).toBeNull();
  });

  test("warns visibly when the browser refuses to save facts", async ({ page }) => {
    await completeWizard(page, "E2E Storage");
    await page.evaluate(() => {
      window.localStorage.setItem = () => {
        throw new Error("quota exceeded");
      };
    });
    await page.getByRole("button", { name: /Receive basket/i }).first().click();
    await expect(page.getByRole("status")).toContainText(/refused to save/i);
  });
});

test.describe("explore journeys", () => {
  test("advance one week and jump across the journey", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("link", { name: /Open the journey/i }).first().click();
    await expect(page.getByText("Week 1 of 8", { exact: true })).toBeVisible();
    await expect(page.getByText(/Simulated household/)).toBeVisible();

    await page.getByRole("button", { name: /Advance one week/i }).click();
    await expect(page.getByText("Week 2 of 8", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "W5", exact: true }).click();
    await expect(page.getByText("Week 5 of 8", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator('dl[aria-label="This week at a glance"] dt')).toHaveCount(4);
  });

  test("replay through Week 8 shows the learning summary", async ({ page }) => {
    await page.goto("/explore/cuisine_explorer");
    await page.getByRole("button", { name: /Replay to Week 8/i }).click();
    await expect(page.getByText("Week 8 of 8", { exact: true })).toBeVisible();
    await expect(page.getByLabel("What Blinkitchen learned")).toBeVisible();
    await expect(page.getByLabel("Ingredient chaining")).toBeVisible();
    await expect(page.getByText(/weeks completed/i)).toBeVisible();
  });
});

test.describe("blinkit lens", () => {
  test("loads cohort insights and labels them as simulated", async ({ page }) => {
    await page.goto("/blinkit");
    await expect(page.getByText(/SIMULATED DATA/)).toBeVisible();
    await expect(page.getByRole("table").first()).toBeVisible();

    for (const household of ["The Mehtas", "The Khannas", "The Sharmas", "The Iyers"]) {
      await expect(page.getByText(household)).toBeVisible();
    }

    await expect(page.getByLabel("Strategic read-out")).toBeVisible();
  });
});

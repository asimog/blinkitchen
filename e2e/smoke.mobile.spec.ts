import { expect, test } from "@playwright/test";
import { startKitchen } from "./helpers";

test("every tab fits a phone without sideways scroll", async ({ page }) => {
  await startKitchen(page);
  await page.getByRole("button", { name: "Fill the rest for me" }).click();

  for (const path of ["/", "/week", "/checkout", "/pantry", "/kitchen"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();

    const width = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));

    expect(width.content, path).toBeLessThanOrEqual(width.viewport);
  }
});

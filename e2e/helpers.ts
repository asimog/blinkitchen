import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Three taps in: people, diet, what is at home. Lands on the swipe planner. */
export async function startKitchen(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page).toHaveURL(/\/start$/);
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "Veg", exact: true }).click();
  await page.getByRole("button", { name: "Onion", exact: true }).click();
  await page.getByRole("button", { name: /Show my week/ }).click();
  await expect(page).toHaveURL(/\/week$/);
  await expect(page.getByRole("heading", { name: "Fill your week" })).toBeVisible();
}

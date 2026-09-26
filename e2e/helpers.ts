import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Fill the three-step wizard and land on the kitchen page. */
export async function completeWizard(page: Page, householdName: string): Promise<void> {
  await page.goto("/build");
  await page.getByLabel("Household name").fill(householdName);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 2 of 3")).toBeVisible();
  await page.getByRole("checkbox", { name: "punjabi", exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 3 of 3")).toBeVisible();
  await page.getByRole("checkbox", { name: "Onion", exact: true }).check();
  await page.getByRole("button", { name: "Start Week 1" }).click();

  await expect(page).toHaveURL(/\/kitchen$/);
  await expect(page.getByText("Week 1 of 8", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: householdName, exact: true })).toBeVisible();
}

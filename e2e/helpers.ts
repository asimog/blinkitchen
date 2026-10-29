import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Three taps in: people, diet, then dinners only. Lands on the swipe planner. */
export async function startKitchen(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page).toHaveURL(/\/start$/);
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "Veg", exact: true }).click();
  await page.getByRole("button", { name: /Pick my meals/ }).click();
  await expect(page).toHaveURL(/\/week$/);
  await expect(page.getByRole("heading", { name: "Fill your week" })).toBeVisible();
}

/** Planner -> what's at home -> basket, answering with the usual staples. */
export async function checkOutUsual(page: Page): Promise<void> {
  await page.getByRole("link", { name: /what's at home/ }).click();
  await expect(page.getByRole("heading", { name: "What's already home?" })).toBeVisible();
  await page.getByRole("button", { name: /The usual stuff/ }).click();
  await expect(page.getByRole("heading", { name: "Your basket" })).toBeVisible();
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page).toHaveURL(/\/$/);
}

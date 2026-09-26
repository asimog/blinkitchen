import { formatQuantity } from "@/domain/units";
import type { CanonicalUnit } from "@/domain/units";
import { formatRupees } from "@/domain/units";

/**
 * All human-readable reasoning lives here. Every significant recommendation
 * composes its explanation from these helpers, so the copy stays consistent
 * and testable.
 */

const MAX_BULLETS = 5;

function cap(bullets: string[]): string[] {
  return bullets.filter(Boolean).slice(0, MAX_BULLETS);
}

export function explainMeal(input: {
  coveragePercent: number;
  additionalCost: number;
  cuisineName: string;
  cuisineAffinity: number;
  sharedIngredientNames: string[];
  useSoonNames: string[];
  minutes: number;
  convenienceEvidence: number;
}): string[] {
  const bullets: string[] = [];

  if (input.coveragePercent > 0) {
    bullets.push(
      `${Math.round(input.coveragePercent)}% of these ingredients are already in your kitchen.`,
    );
  }

  if (input.useSoonNames.length > 0) {
    bullets.push(
      `Uses ${input.useSoonNames.join(", ")} before ${input.useSoonNames.length === 1 ? "it goes" : "they go"} stale.`,
    );
  }

  if (input.cuisineAffinity >= 0.5) {
    bullets.push(`Matches your ${input.cuisineName} preference.`);
  }

  if (input.sharedIngredientNames.length > 0) {
    bullets.push(`Shares ${input.sharedIngredientNames.join(", ")} with other meals this week.`);
  }

  if (input.additionalCost > 0) {
    bullets.push(
      `Requires about ${formatRupees(input.additionalCost)} of additional groceries.`,
    );
  } else {
    bullets.push("Needs nothing extra — cook it from what you have.");
  }

  if (input.convenienceEvidence >= 0.5 || input.minutes <= 25) {
    bullets.push(`Ready in about ${input.minutes} minutes.`);
  }

  return cap(bullets);
}

const MAX_PLAN_BULLETS = 3;

/**
 * Why the planner chose this meal for this slot of this week's plan. Written
 * from the plan-level evaluation: reuse and rescue lead, cost follows.
 */
export function explainPlannedMeal(input: {
  coveragePercent: number;
  reuseNames: string[];
  rescuedNames: string[];
  incrementalCost: number;
  cuisineName: string;
  cuisineRepeats: number;
  minutes: number;
  convenienceEvidence: number;
}): string[] {
  const bullets: string[] = [];

  if (input.reuseNames.length > 0) {
    bullets.push(
      `Shares ${input.reuseNames.slice(0, 3).join(", ")} with earlier meals, so one pack goes further.`,
    );
  }

  if (input.rescuedNames.length > 0) {
    bullets.push(`Uses ${input.rescuedNames.slice(0, 2).join(", ")} before it goes stale.`);
  }

  if (input.coveragePercent >= 50) {
    bullets.push(
      `${Math.round(input.coveragePercent)}% of its ingredients are already in your kitchen.`,
    );
  }

  if (input.incrementalCost > 0) {
    bullets.push(`Adds about ${formatRupees(input.incrementalCost)} to this week's basket.`);
  } else if (bullets.length < MAX_PLAN_BULLETS) {
    bullets.push("Adds nothing new to this week's basket.");
  }

  if (bullets.length < MAX_PLAN_BULLETS && input.cuisineRepeats > 0) {
    bullets.push(`Adds ${input.cuisineName} variety alongside your other planned meals.`);
  }

  if (bullets.length < MAX_PLAN_BULLETS && input.minutes <= 25) {
    bullets.push(`Ready in about ${input.minutes} minutes.`);
  }

  if (bullets.length === 0) {
    bullets.push("One of the strongest matches for this week's plan.");
  }

  return bullets.slice(0, MAX_PLAN_BULLETS);
}

export function explainBasketItem(input: {
  required: number;
  owned: number;
  missing: number;
  unit: CanonicalUnit;
  packCount: number;
  packSize: number;
  packUnit: CanonicalUnit;
  brand: string;
  lineCost: number;
  status: "covered" | "buy" | "unavailable";
}): string[] {
  if (input.status === "covered") {
    return ["Fully covered by your pantry — nothing to buy."];
  }

  const bullets = [
    `Required ${formatQuantity(input.required, input.unit)} for this week's plan.`,
    `You already have ${formatQuantity(input.owned, input.unit)}.`,
  ];

  if (input.status === "buy" && input.packCount > 0) {
    bullets.push(
      `Buy ${input.packCount} × ${formatQuantity(input.packSize, input.packUnit)} ${input.brand} — ${formatRupees(input.lineCost)}.`,
    );
  } else {
    bullets.push("No simulated SKU can cover this right now.");
  }

  return cap(bullets);
}

export function explainSubstitution(input: {
  reason: string;
  compatibilityScore: number;
  acceptedCount: number;
  rejectedCount: number;
  ratio: number;
}): string[] {
  const bullets = [input.reason];

  if (input.acceptedCount > 0) {
    bullets.push(
      `You accepted this swap ${input.acceptedCount === 1 ? "once" : `${input.acceptedCount} times`} before — it ranks higher now.`,
    );
  } else if (input.rejectedCount > 0) {
    bullets.push(
      `You turned this down ${input.rejectedCount === 1 ? "once" : `${input.rejectedCount} times`} before — it ranks lower now.`,
    );
  } else {
    bullets.push("First time suggested — your decision shapes the next time.");
  }

  if (input.ratio !== 1) {
    bullets.push(`Use ${input.ratio}× the quantity for this swap.`);
  }

  return cap(bullets);
}

export function explainReplenishment(input: {
  usedWeekCount: number;
  windowWeeks: number;
  remaining: number;
  unit: CanonicalUnit;
  weeksOfUseLeft: number;
}): string[] {
  const headline =
    input.remaining <= 0
      ? "You use this often and it has run out."
      : "You use this often and you're running low.";

  const remainingLine =
    input.remaining <= 0
      ? "Nothing left in the pantry."
      : `Only ${formatQuantity(input.remaining, input.unit)} left — about ${
          Math.round(input.weeksOfUseLeft * 10) / 10
        } weeks of use.`;

  return cap([headline, `Used in ${input.usedWeekCount} of the last ${input.windowWeeks} weeks.`, remainingLine]);
}

export function explainChain(recipeNames: string[]): string {
  return `Buy once, use across ${recipeNames.length} meals: ${recipeNames.join(", ")}.`;
}

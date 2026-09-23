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
      `Requires about ${formatRupees(input.additionalCost)} of additional simulated groceries.`,
    );
  } else {
    bullets.push("Needs nothing extra — cook it from what you have.");
  }
  if (input.convenienceEvidence >= 0.5 || input.minutes <= 25) {
    bullets.push(`Ready in about ${input.minutes} minutes.`);
  }
  return cap(bullets);
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
  const bullets = [input.reason, `Compatibility ${Math.round(input.compatibilityScore * 100)}%.`];
  if (input.acceptedCount > 0) {
    bullets.push(
      `You accepted this swap ${input.acceptedCount === 1 ? "once" : `${input.acceptedCount} times`} before — the suggestion got stronger.`,
    );
  } else if (input.rejectedCount > 0) {
    bullets.push(
      `You turned this down ${input.rejectedCount === 1 ? "once" : `${input.rejectedCount} times`} before — the suggestion is weaker.`,
    );
  } else {
    bullets.push("First time suggested — your decision will shape future recommendations.");
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
  const remainingLine =
    input.remaining <= 0
      ? "Nothing left in the pantry."
      : input.weeksOfUseLeft < 1
        ? `Only ${formatQuantity(input.remaining, input.unit)} left — less than a week of use.`
        : `Only ${formatQuantity(input.remaining, input.unit)} left — about ${
            Math.round(input.weeksOfUseLeft * 10) / 10
          } weeks of use.`;
  return cap([`Used in ${input.usedWeekCount} of the last ${input.windowWeeks} weeks.`, remainingLine]);
}

export function explainChain(recipeNames: string[]): string {
  return `Buy once, use across ${recipeNames.length} meals: ${recipeNames.join(", ")}.`;
}

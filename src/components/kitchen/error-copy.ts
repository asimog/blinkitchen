import type { KitchenError } from "@/domain/kitchen/commands";

/**
 * Plain-language copy for typed domain errors. Error codes stay in the domain;
 * the UI never shows them to the household.
 */
export function kitchenErrorCopy(error: KitchenError): string {
  switch (error.code) {
    case "insufficient_stock":
      return `${error.message}. Receive the basket first, or record a smaller quantity.`;
    case "journey_complete":
      return "The eight-week journey is complete — reset the prototype to start again.";
    case "invalid_command":
      return "That action is not available here.";
    case "limit_reached":
      return "This prototype kitchen has reached its recorded-history limit.";
    case "unit_mismatch":
      return "That ingredient is tracked in different units — use the unit shown in the pantry.";
    default:
      return error.message;
  }
}
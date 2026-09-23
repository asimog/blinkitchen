import { normalizeQuantity, formatQuantity } from "@/domain/units";
import type { Unit } from "@/domain/units";

/** Display a stored pantry quantity in canonical, human-readable form. */
export function displayQuantity(quantity: number, unit: Unit): string {
  const normalized = normalizeQuantity(quantity, unit);

  return formatQuantity(normalized.quantity, normalized.unit);
}

/** Display a simulated pack size in canonical, human-readable form. */
export function displayPack(packSize: number, unit: Unit): string {
  return displayQuantity(packSize, unit);
}

export function percent(value: number): string {
  return `${Math.round(value)}%`;
}

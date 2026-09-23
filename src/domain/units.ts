/**
 * Units and quantity normalization.
 *
 * This is the leaf of the dependency graph: both the catalog and the kitchen
 * domain depend on it, and it depends on nothing.
 *
 * Rules:
 * - Supported units are deliberately few: g, kg, ml, l, piece, packet.
 * - kg -> g and l -> ml are the only conversions ever inferred.
 * - Cross-dimension conversion (piece <-> g) is never inferred; callers must
 *   treat incompatible quantities as separate things.
 * - Quantities are rounded to 2 decimal places.
 */

import { z } from "zod";

export const UNITS = ["g", "kg", "ml", "l", "piece", "packet"] as const;

export type Unit = (typeof UNITS)[number];

/** Boundary parser for units; the single definition reused by every schema. */
export const unitSchema = z.enum(UNITS);

/** Canonical units: what quantities are normalized to for comparison. */
export const CANONICAL_UNITS = ["g", "ml", "piece", "packet"] as const;

export type CanonicalUnit = (typeof CANONICAL_UNITS)[number];

/**
 * Compatibility families. Only units in the same family can be compared:
 * mass (g/kg), volume (ml/l), and the two indivisible counts piece / packet.
 * A piece and a packet are never interchangeable.
 */
export type UnitDimension = "mass" | "volume" | "piece" | "packet";

const DIMENSION_BY_UNIT: Record<Unit, UnitDimension> = {
  g: "mass",
  kg: "mass",
  ml: "volume",
  l: "volume",
  piece: "piece",
  packet: "packet",
};

const CANONICAL_BY_UNIT: Record<Unit, CanonicalUnit> = {
  g: "g",
  kg: "g",
  ml: "ml",
  l: "ml",
  piece: "piece",
  packet: "packet",
};

export function isUnit(value: unknown): value is Unit {
  return unitSchema.safeParse(value).success;
}

export function dimensionOf(unit: Unit): UnitDimension {
  return DIMENSION_BY_UNIT[unit];
}

/** True when two units describe the same dimension and can be compared. */
export function unitsCompatible(a: Unit, b: Unit): boolean {
  return dimensionOf(a) === dimensionOf(b);
}

export function canonicalUnitOf(unit: Unit): CanonicalUnit {
  return CANONICAL_BY_UNIT[unit];
}

/** Round to 2 decimal places, avoiding float drift on values like 0.145. */
export function roundQuantity(quantity: number): number {
  return Math.round((quantity + Number.EPSILON) * 100) / 100;
}

export type Quantity = { quantity: number; unit: CanonicalUnit };

/**
 * Normalize a quantity into its canonical unit (kg -> g, l -> ml).
 *
 * Throws only on programmer errors: negative or non-finite quantities. User
 * input is validated (Zod / commands) before reaching this function.
 */
export function normalizeQuantity(quantity: number, unit: Unit): Quantity {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new RangeError(`Quantity must be a nonnegative finite number, got ${quantity}`);
  }

  const factor = unit === "kg" || unit === "l" ? 1000 : 1;

  return { quantity: roundQuantity(quantity * factor), unit: canonicalUnitOf(unit) };
}

/**
 * Convert a quantity from one unit to another when compatible.
 * Returns null when the dimensions differ (never infers piece <-> g).
 */
export function convertQuantity(quantity: number, from: Unit, to: Unit): number | null {
  if (!unitsCompatible(from, to)) return null;
  const normalized = normalizeQuantity(quantity, from);
  const targetFactor = to === "kg" || to === "l" ? 1000 : 1;

  return roundQuantity(normalized.quantity / targetFactor);
}

/** Human-readable quantity, e.g. "180 g", "1.5 kg", "2 piece". */
export function formatQuantity(quantity: number, unit: CanonicalUnit): string {
  const rounded = roundQuantity(quantity);

  if (unit === "g" && rounded >= 1000) {
    return `${roundQuantity(rounded / 1000)} kg`;
  }

  if (unit === "ml" && rounded >= 1000) {
    return `${roundQuantity(rounded / 1000)} l`;
  }

  const label = rounded === 1 ? unit : `${unit}`;

  return `${rounded} ${label}`;
}

/** Simulated rupee formatting used across intelligence output. */
export function formatRupees(amount: number): string {
  return `₹${Math.round(amount)}`;
}

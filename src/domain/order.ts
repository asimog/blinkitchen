/**
 * Deterministic string ordering.
 *
 * `String.prototype.localeCompare` depends on the runtime's ICU collation, so
 * two environments (Node build in CI, browser, different ICU builds) can order
 * the same strings differently. Intelligence and simulation must be identical
 * everywhere, so the pure core uses plain code-unit comparison instead.
 */
export function compareStrings(a: string, b: string): number {
  if (a < b) return -1;

  if (a > b) return 1;

  return 0;
}

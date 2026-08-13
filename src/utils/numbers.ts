/**
 * Small numeric helpers used by the domain layer.
 *
 * The important one is `safeDivide`: ThinkTwice divides by user-supplied
 * figures (income, available money, usage counts) that are legitimately zero,
 * and the UI must never render `Infinity` or `NaN`.
 */

/** Divides, returning `null` when the result would not be a finite number. */
export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/** Rounds to a fixed number of decimals without floating-point drift artefacts. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** True for finite numbers only — guards every value that reaches the UI. */
export function isDisplayableNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

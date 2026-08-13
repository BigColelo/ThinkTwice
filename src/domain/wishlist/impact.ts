import type { MonthlyFinances } from '@/domain/money/calculations';
import type { Cents } from '@/types/domain';
import { safeDivide } from '@/utils/numbers';

/**
 * How a potential purchase sits against the user's monthly picture.
 *
 * This describes a price in the user's own terms. It never concludes anything:
 * there is no "you can afford this" and no "you cannot". Every field can be
 * `null`, and the UI shows an explicit unavailable state rather than `NaN`.
 */

export type ImpactLevel = 'low' | 'moderate' | 'high' | 'unknown';

export type PurchaseImpact = {
  /** price ÷ monthly net income. `1.09` renders as `109%`. */
  incomeRatio: number | null;
  /** price ÷ available after commitments. */
  availableRatio: number | null;
  /** How many months of available money the price represents. */
  monthsOfAvailableMoney: number | null;
  level: ImpactLevel;
  /**
   * Why the level could not be determined — drives the copy in the UI.
   * `null` when a level was determined.
   */
  unavailableReason: 'no_income' | 'no_available_money' | null;
};

/**
 * Thresholds for the impact label, expressed against available-after-commitments
 * money. They are fixed and documented so the label is always explainable:
 *
 *   ≤ 25% of a month's available money  → low
 *   ≤ 100%                              → moderate
 *   > 100%                              → high
 *
 * The label describes size, not advisability.
 */
export const IMPACT_LOW_MAX_RATIO = 0.25;
export const IMPACT_MODERATE_MAX_RATIO = 1;

export function calculatePurchaseImpact(
  priceCents: Cents,
  finances: MonthlyFinances,
): PurchaseImpact {
  const price = Number.isFinite(priceCents) ? priceCents : 0;

  const incomeRatio =
    finances.isIncomeConfigured && finances.netIncomeCents > 0
      ? safeDivide(price, finances.netIncomeCents)
      : null;

  const available = finances.availableAfterCommitmentsCents;
  const hasAvailableMoney = available > 0;

  const availableRatio = hasAvailableMoney ? safeDivide(price, available) : null;
  const monthsOfAvailableMoney = availableRatio;

  if (!finances.isIncomeConfigured) {
    return {
      incomeRatio: null,
      availableRatio: null,
      monthsOfAvailableMoney: null,
      level: 'unknown',
      unavailableReason: 'no_income',
    };
  }

  if (!hasAvailableMoney) {
    // Income is known but commitments consume all of it: the percentage of
    // income is still meaningful, the months-of-available figure is not.
    return {
      incomeRatio,
      availableRatio: null,
      monthsOfAvailableMoney: null,
      level: 'unknown',
      unavailableReason: 'no_available_money',
    };
  }

  return {
    incomeRatio,
    availableRatio,
    monthsOfAvailableMoney,
    level: classifyImpact(availableRatio),
    unavailableReason: null,
  };
}

export function classifyImpact(availableRatio: number | null): ImpactLevel {
  if (availableRatio == null || !Number.isFinite(availableRatio)) return 'unknown';
  if (availableRatio <= IMPACT_LOW_MAX_RATIO) return 'low';
  if (availableRatio <= IMPACT_MODERATE_MAX_RATIO) return 'moderate';
  return 'high';
}

/** Neutral, non-judgemental label for an impact level. */
export function impactLevelLabel(level: ImpactLevel): string {
  switch (level) {
    case 'low':
      return 'Low';
    case 'moderate':
      return 'Moderate';
    case 'high':
      return 'High';
    case 'unknown':
      return 'Not available';
  }
}

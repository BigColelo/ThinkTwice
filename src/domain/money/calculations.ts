import type { Cents, RecurringCommitment } from '@/types/domain';
import { safeDivide } from '@/utils/numbers';

import { calculateTotalMonthlyCommitments } from '../recurring/calculations';

/**
 * The monthly picture ThinkTwice builds every other number on.
 *
 *   monthly net income − monthly recurring commitments = available after commitments
 *
 * "Available after commitments" is deliberately not called disposable income:
 * it is simply what is left once predictable commitments are accounted for.
 * A savings target is kept conceptually separate and subtracted only for the
 * secondary "available after savings goal" figure.
 */

export type MonthlyFinances = {
  netIncomeCents: Cents;
  /** Monthly equivalent of every active recurring commitment. */
  commitmentsCents: Cents;
  savingsTargetCents: Cents | null;

  /** income − commitments. Can be negative when commitments exceed income. */
  availableAfterCommitmentsCents: Cents;
  /** available − savings target. `null` when no target is configured. */
  availableAfterSavingsGoalCents: Cents | null;

  /** available ÷ income, for the summary ring. `null` when income is not usable. */
  availableToIncomeRatio: number | null;
  /** commitments ÷ income. `null` when income is not usable. */
  commitmentsToIncomeRatio: number | null;

  /** False until the user enters an income above zero — screens show a setup prompt. */
  isIncomeConfigured: boolean;
  /** True when commitments are larger than income; the UI states this neutrally. */
  commitmentsExceedIncome: boolean;
};

export type MonthlyFinancesInput = {
  monthlyNetIncomeCents: Cents;
  monthlySavingsTargetCents: Cents | null;
  commitments: readonly RecurringCommitment[];
};

export function calculateMonthlyFinances(input: MonthlyFinancesInput): MonthlyFinances {
  const netIncomeCents = normaliseAmount(input.monthlyNetIncomeCents);
  const commitmentsCents = calculateTotalMonthlyCommitments(input.commitments);
  const savingsTargetCents =
    input.monthlySavingsTargetCents == null
      ? null
      : normaliseAmount(input.monthlySavingsTargetCents);

  const availableAfterCommitmentsCents = netIncomeCents - commitmentsCents;
  const availableAfterSavingsGoalCents =
    savingsTargetCents == null ? null : availableAfterCommitmentsCents - savingsTargetCents;

  const isIncomeConfigured = netIncomeCents > 0;

  return {
    netIncomeCents,
    commitmentsCents,
    savingsTargetCents,
    availableAfterCommitmentsCents,
    availableAfterSavingsGoalCents,
    availableToIncomeRatio: isIncomeConfigured
      ? safeDivide(availableAfterCommitmentsCents, netIncomeCents)
      : null,
    commitmentsToIncomeRatio: isIncomeConfigured
      ? safeDivide(commitmentsCents, netIncomeCents)
      : null,
    isIncomeConfigured,
    commitmentsExceedIncome: isIncomeConfigured && commitmentsCents > netIncomeCents,
  };
}

/** Convenience for the many places that only need the headline figure. */
export function calculateAvailableAfterCommitments(
  netIncomeCents: Cents,
  commitments: readonly RecurringCommitment[],
): Cents {
  return normaliseAmount(netIncomeCents) - calculateTotalMonthlyCommitments(commitments);
}

/** Guards against `NaN`/`Infinity` reaching a calculation from stored data. */
function normaliseAmount(value: Cents): Cents {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

/** An empty picture, used before settings have loaded. */
export const EMPTY_MONTHLY_FINANCES: MonthlyFinances = {
  netIncomeCents: 0,
  commitmentsCents: 0,
  savingsTargetCents: null,
  availableAfterCommitmentsCents: 0,
  availableAfterSavingsGoalCents: null,
  availableToIncomeRatio: null,
  commitmentsToIncomeRatio: null,
  isIncomeConfigured: false,
  commitmentsExceedIncome: false,
};

import { getFrequency } from '@/constants/frequencies';
import type { Cents, CommitmentFrequency, RecurringCommitment } from '@/types/domain';

/**
 * Normalising recurring commitments to a monthly figure.
 *
 * A commitment is stored as it is actually billed (€300 every quarter), and the
 * monthly equivalent is derived: `amount × occurrencesPerYear ÷ 12`.
 *
 *   €600 monthly    → €600/month
 *   €300 quarterly  → €100/month
 *   €600 annually   → €50/month
 */

/**
 * Monthly equivalent of a single commitment, in whole cents.
 *
 * Each commitment is rounded individually so the per-row figures the user sees
 * add up exactly to the total the app shows.
 */
export function calculateMonthlyCommitmentEquivalent(commitment: {
  amountCents: Cents;
  frequency: CommitmentFrequency;
}): Cents {
  const { amountCents, frequency } = commitment;
  if (!Number.isFinite(amountCents)) return 0;

  const { occurrencesPerYear } = getFrequency(frequency);
  return Math.round((amountCents * occurrencesPerYear) / 12);
}

/** Annual cost of a single commitment, in whole cents. */
export function calculateAnnualCommitmentEquivalent(commitment: {
  amountCents: Cents;
  frequency: CommitmentFrequency;
}): Cents {
  const { amountCents, frequency } = commitment;
  if (!Number.isFinite(amountCents)) return 0;
  return Math.round(amountCents * getFrequency(frequency).occurrencesPerYear);
}

/** Sum of the monthly equivalents of every active commitment. */
export function calculateTotalMonthlyCommitments(
  commitments: readonly RecurringCommitment[],
): Cents {
  return commitments.reduce(
    (total, commitment) =>
      commitment.isActive ? total + calculateMonthlyCommitmentEquivalent(commitment) : total,
    0,
  );
}

/**
 * Annualised commitments. Derived from the monthly total (×12) rather than from
 * each commitment's own yearly cost, so the yearly figure always equals twelve
 * times the monthly figure the user is shown — no unexplained discrepancy.
 */
export function calculateTotalAnnualCommitments(
  commitments: readonly RecurringCommitment[],
): Cents {
  return calculateTotalMonthlyCommitments(commitments) * 12;
}

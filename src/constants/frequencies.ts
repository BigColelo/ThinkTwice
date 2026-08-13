import type { CommitmentFrequency } from '@/types/domain';

/**
 * Recurring-commitment frequencies and how many times per year each occurs.
 *
 * The monthly equivalent of a commitment is `amount × occurrencesPerYear / 12`,
 * so a €300 quarterly bill is €100/month and a €600 annual one is €50/month.
 */

export type FrequencyOption = {
  id: CommitmentFrequency;
  label: string;
  /** Short form for list rows, e.g. `/quarter`. */
  shortLabel: string;
  occurrencesPerYear: number;
};

export const COMMITMENT_FREQUENCIES: readonly FrequencyOption[] = [
  { id: 'monthly', label: 'Monthly', shortLabel: 'month', occurrencesPerYear: 12 },
  {
    id: 'every_two_months',
    label: 'Every 2 months',
    shortLabel: '2 months',
    occurrencesPerYear: 6,
  },
  { id: 'quarterly', label: 'Quarterly', shortLabel: 'quarter', occurrencesPerYear: 4 },
  { id: 'semiannual', label: 'Every 6 months', shortLabel: '6 months', occurrencesPerYear: 2 },
  { id: 'annual', label: 'Yearly', shortLabel: 'year', occurrencesPerYear: 1 },
];

const BY_ID = new Map<CommitmentFrequency, FrequencyOption>(
  COMMITMENT_FREQUENCIES.map((option) => [option.id, option]),
);

export function getFrequency(id: CommitmentFrequency): FrequencyOption {
  const option = BY_ID.get(id);
  if (!option) {
    // Unreachable for valid data; keeping a total function avoids `undefined`
    // leaking into a monthly-equivalent calculation.
    return { id: 'monthly', label: 'Monthly', shortLabel: 'month', occurrencesPerYear: 12 };
  }
  return option;
}

export const DEFAULT_COMMITMENT_FREQUENCY: CommitmentFrequency = 'monthly';

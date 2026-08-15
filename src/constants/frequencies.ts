import type { TranslationKey } from '@/i18n';
import type { CommitmentFrequency } from '@/types/domain';

/**
 * Recurring-commitment frequencies and how many times per year each occurs.
 *
 * The monthly equivalent of a commitment is `amount × occurrencesPerYear / 12`,
 * so a €300 quarterly bill is €100/month and a €600 annual one is €50/month.
 */

export type FrequencyOption = {
  id: CommitmentFrequency;
  labelKey: TranslationKey;
  /** Short form for list rows, e.g. `/quarter`. */
  shortLabelKey: TranslationKey;
  occurrencesPerYear: number;
};

const MONTHLY: FrequencyOption = {
  id: 'monthly',
  labelKey: 'frequencies.monthly',
  shortLabelKey: 'frequencies.short.monthly',
  occurrencesPerYear: 12,
};

export const COMMITMENT_FREQUENCIES: readonly FrequencyOption[] = [
  MONTHLY,
  {
    id: 'every_two_months',
    labelKey: 'frequencies.every_two_months',
    shortLabelKey: 'frequencies.short.every_two_months',
    occurrencesPerYear: 6,
  },
  {
    id: 'quarterly',
    labelKey: 'frequencies.quarterly',
    shortLabelKey: 'frequencies.short.quarterly',
    occurrencesPerYear: 4,
  },
  {
    id: 'semiannual',
    labelKey: 'frequencies.semiannual',
    shortLabelKey: 'frequencies.short.semiannual',
    occurrencesPerYear: 2,
  },
  {
    id: 'annual',
    labelKey: 'frequencies.annual',
    shortLabelKey: 'frequencies.short.annual',
    occurrencesPerYear: 1,
  },
];

const BY_ID = new Map<CommitmentFrequency, FrequencyOption>(
  COMMITMENT_FREQUENCIES.map((option) => [option.id, option]),
);

export function getFrequency(id: CommitmentFrequency): FrequencyOption {
  // Unreachable for valid data; keeping a total function avoids `undefined`
  // leaking into a monthly-equivalent calculation.
  return BY_ID.get(id) ?? MONTHLY;
}

export const DEFAULT_COMMITMENT_FREQUENCY: CommitmentFrequency = 'monthly';

import type { UsageFrequencyId } from '@/types/domain';

/**
 * Expected-usage presets.
 *
 * Every preset resolves to a single documented `usesPerMonth` rate — the app
 * never carries a range into a calculation. Where a label describes a range
 * ("2–3 times per week") the rate is the **midpoint**, stated here so the
 * number the user sees can always be traced back to an explicit assumption.
 *
 * A month is treated as 52/12 weeks (≈4.333), which keeps weekly and monthly
 * rates consistent with each other over a year.
 */

export const WEEKS_PER_MONTH = 52 / 12;
export const MONTHS_PER_YEAR = 12;

export type UsagePreset = {
  id: UsageFrequencyId;
  label: string;
  /** Shown under the label to make the assumption visible. */
  detail: string;
  /**
   * Uses per month. `null` for `custom`, where the user supplies the rate.
   */
  usesPerMonth: number | null;
};

export const USAGE_PRESETS: readonly UsagePreset[] = [
  {
    id: 'daily',
    label: 'Daily',
    detail: 'About once a day',
    usesPerMonth: 7 * WEEKS_PER_MONTH, // ≈30.3
  },
  {
    id: 'several_times_week',
    label: 'Several times per week',
    detail: '2–3 times per week (midpoint: 2.5)',
    usesPerMonth: 2.5 * WEEKS_PER_MONTH, // ≈10.8
  },
  {
    id: 'weekly',
    label: 'Weekly',
    detail: 'About once a week',
    usesPerMonth: 1 * WEEKS_PER_MONTH, // ≈4.3
  },
  {
    id: 'several_times_month',
    label: 'Several times per month',
    detail: '2–3 times per month (midpoint: 2.5)',
    usesPerMonth: 2.5,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    detail: 'About once a month',
    usesPerMonth: 1,
  },
  {
    id: 'occasionally',
    label: 'Occasionally',
    detail: 'A few times a year (4 per year)',
    usesPerMonth: 4 / MONTHS_PER_YEAR, // ≈0.33
  },
  {
    id: 'custom',
    label: 'Custom',
    detail: 'Set your own number of uses per month',
    usesPerMonth: null,
  },
];

const PRESET_BY_ID = new Map<UsageFrequencyId, UsagePreset>(
  USAGE_PRESETS.map((preset) => [preset.id, preset]),
);

export function getUsagePreset(id: UsageFrequencyId): UsagePreset | undefined {
  return PRESET_BY_ID.get(id);
}

export const DEFAULT_USAGE_FREQUENCY: UsageFrequencyId = 'weekly';

/** Short label for chips and list rows, e.g. `2–3 times per week`. */
export function usageFrequencyShortLabel(
  id: UsageFrequencyId | null,
  customUsesPerMonth: number | null,
): string {
  if (!id) return 'Not set';
  if (id === 'custom') {
    if (customUsesPerMonth == null || !Number.isFinite(customUsesPerMonth)) return 'Custom';
    const rounded = Math.round(customUsesPerMonth * 10) / 10;
    return `${rounded} ${rounded === 1 ? 'use' : 'uses'} per month`;
  }
  const preset = getUsagePreset(id);
  if (!preset) return 'Not set';
  return preset.id === 'several_times_week'
    ? '2–3 times per week'
    : preset.id === 'several_times_month'
      ? '2–3 times per month'
      : preset.label;
}

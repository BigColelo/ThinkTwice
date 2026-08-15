import type { TFunction } from 'i18next';

import type { TranslationKey } from '@/i18n';
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
  labelKey: TranslationKey;
  /** Shown under the label to make the assumption visible. */
  detailKey: TranslationKey;
  /**
   * Uses per month. `null` for `custom`, where the user supplies the rate.
   */
  usesPerMonth: number | null;
};

/**
 * The frequency ids as a tuple, for the form schemas that validate a choice
 * against them (`z.enum` needs literals, which `USAGE_PRESETS.map` cannot give).
 *
 * Kept here, next to the presets it mirrors, so the two forms that offer these
 * choices share one list. Drift between this and `USAGE_PRESETS` is caught by the
 * schema and mapper tests, which both iterate the presets.
 */
export const USAGE_FREQUENCY_IDS = [
  'daily',
  'several_times_week',
  'weekly',
  'several_times_month',
  'monthly',
  'occasionally',
  'custom',
] as const satisfies readonly UsageFrequencyId[];

export const USAGE_PRESETS: readonly UsagePreset[] = [
  {
    id: 'daily',
    labelKey: 'usage.daily',
    detailKey: 'usage.detail.daily',
    usesPerMonth: 7 * WEEKS_PER_MONTH, // ≈30.3
  },
  {
    id: 'several_times_week',
    labelKey: 'usage.several_times_week',
    detailKey: 'usage.detail.several_times_week',
    usesPerMonth: 2.5 * WEEKS_PER_MONTH, // ≈10.8
  },
  {
    id: 'weekly',
    labelKey: 'usage.weekly',
    detailKey: 'usage.detail.weekly',
    usesPerMonth: 1 * WEEKS_PER_MONTH, // ≈4.3
  },
  {
    id: 'several_times_month',
    labelKey: 'usage.several_times_month',
    detailKey: 'usage.detail.several_times_month',
    usesPerMonth: 2.5,
  },
  {
    id: 'monthly',
    labelKey: 'usage.monthly',
    detailKey: 'usage.detail.monthly',
    usesPerMonth: 1,
  },
  {
    id: 'occasionally',
    labelKey: 'usage.occasionally',
    detailKey: 'usage.detail.occasionally',
    usesPerMonth: 4 / MONTHS_PER_YEAR, // ≈0.33
  },
  {
    id: 'custom',
    labelKey: 'usage.custom',
    detailKey: 'usage.detail.custom',
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

/**
 * Short label for chips and list rows, e.g. `2–3 times per week`.
 *
 * Takes `t` rather than importing it, so a component holds the translation
 * function it was re-rendered with. The two ranged presets get a shorter form
 * without the midpoint, which belongs on the form where the choice is made, not
 * on a chip summarising it afterwards.
 */
export function usageFrequencyShortLabel(
  t: TFunction,
  id: UsageFrequencyId | null,
  customUsesPerMonth: number | null,
): string {
  if (!id) return t('common.notSet');
  if (id === 'custom') {
    if (customUsesPerMonth == null || !Number.isFinite(customUsesPerMonth))
      return t('usage.custom');
    return t('usage.customRate', { count: Math.round(customUsesPerMonth * 10) / 10 });
  }

  const preset = getUsagePreset(id);
  if (!preset) return t('common.notSet');
  if (preset.id === 'several_times_week') return t('usage.short.several_times_week');
  if (preset.id === 'several_times_month') return t('usage.short.several_times_month');
  return t(preset.labelKey);
}

import { getUsagePreset } from '@/constants/usagePresets';
import type { Cents, UsageFrequencyId } from '@/types/domain';
import { safeDivide } from '@/utils/numbers';

/**
 * Turning "I'll use it a few times a week for five years" into numbers.
 *
 *   uses per month × ownership months = estimated uses
 *   price ÷ estimated uses            = estimated cost per use
 *
 * Ranges are resolved to their midpoint in `constants/usagePresets`, which is
 * the single place that mapping lives.
 */

export type ExpectedUsageInput = {
  frequency: UsageFrequencyId | null;
  /** Uses per month; only read when `frequency` is `custom`. */
  customUsesPerMonth: number | null;
  expectedOwnershipMonths: number | null;
};

/** Resolves an expected-usage selection to uses per month, or `null` if unusable. */
export function resolveUsesPerMonth(input: ExpectedUsageInput): number | null {
  if (!input.frequency) return null;

  if (input.frequency === 'custom') {
    const custom = input.customUsesPerMonth;
    return custom != null && Number.isFinite(custom) && custom > 0 ? custom : null;
  }

  const preset = getUsagePreset(input.frequency);
  return preset?.usesPerMonth != null && preset.usesPerMonth > 0 ? preset.usesPerMonth : null;
}

/**
 * Total uses expected over the ownership period, rounded to a whole number
 * because a fraction of a use is not a meaningful thing to show.
 * Returns `null` when either input is missing or non-positive.
 */
export function calculateEstimatedUses(input: ExpectedUsageInput): number | null {
  const usesPerMonth = resolveUsesPerMonth(input);
  const months = input.expectedOwnershipMonths;

  if (usesPerMonth == null) return null;
  if (months == null || !Number.isFinite(months) || months <= 0) return null;

  const total = Math.round(usesPerMonth * months);
  return total > 0 ? total : null;
}

/**
 * Estimated cost per use, in cents.
 *
 * The result is intentionally *not* rounded to whole cents — it is a derived
 * rate, and `formatMoney` rounds it once, at the point of display.
 * Returns `null` when there is no meaningful number of uses to divide by.
 */
export function calculateEstimatedCostPerUse(
  priceCents: Cents,
  estimatedUses: number | null,
): number | null {
  if (!Number.isFinite(priceCents) || priceCents < 0) return null;
  if (estimatedUses == null || estimatedUses <= 0) return null;
  return safeDivide(priceCents, estimatedUses);
}

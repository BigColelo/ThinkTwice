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

/** The whole estimate: what the two figures above say together. */
export type UsageEstimate = {
  /** Total uses over the ownership period. `null` when the inputs cannot give one. */
  estimatedUses: number | null;
  /** Price ÷ those uses, unrounded. `null` whenever `estimatedUses` is. */
  costPerUseCents: number | null;
};

/**
 * The estimate as one value.
 *
 * The two figures are never shown apart — the form previews them side by side
 * while the user types, and the item's own screen prints the same pair — and
 * the second is derived from the first, so asking for them separately means
 * every caller repeats the order they have to be computed in. Two did, and one
 * of them had to remember to pass `null` through when there was no price yet.
 */
export function calculateUsageEstimate(
  priceCents: Cents | null,
  input: ExpectedUsageInput,
): UsageEstimate {
  const estimatedUses = calculateEstimatedUses(input);

  return {
    estimatedUses,
    costPerUseCents:
      priceCents == null ? null : calculateEstimatedCostPerUse(priceCents, estimatedUses),
  };
}

import { z } from 'zod';

import { MAX_OWNERSHIP_MONTHS, MIN_OWNERSHIP_MONTHS } from '@/constants/ownership';
import { USAGE_FREQUENCY_IDS } from '@/constants/usagePresets';
import { MAX_COOLDOWN_DAYS, MIN_COOLDOWN_DAYS } from '@/domain';
import { requiredAmount } from '@/features/forms/requiredAmount';

/** Validation for the "something I want to buy" form. */

const MAX_PRICE_CENTS = 100_000_000;

const priceCents = z
  .number({ error: 'Enter a price.' })
  .int()
  .positive('Enter a price greater than zero.')
  .max(MAX_PRICE_CENTS, 'That price looks too large.');

export const wishlistItemSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Give this item a name.')
      .max(80, 'Keep the name under 80 characters.'),
    // A price of zero is refused rather than accepted as "unknown": it would
    // travel through the impact calculation as a real figure and label an item
    // whose price was never entered as low impact, 0% of income. In this app
    // what cannot be computed is `null`, never zero — which is also how the
    // field itself starts, empty rather than at zero.
    priceCents: requiredAmount(priceCents),
    categoryId: z.string().min(1, 'Choose a category.'),
    imageUri: z.string().nullable(),

    expectedUsageFrequency: z.enum(USAGE_FREQUENCY_IDS),
    customUsesPerMonth: z
      .number()
      .positive('Enter how many times per month you expect to use it.')
      .max(1000, 'That looks like too many uses per month.')
      .nullable(),
    expectedOwnershipMonths: z
      .number({ error: 'Choose how long you expect to keep it.' })
      .int()
      .min(MIN_OWNERSHIP_MONTHS, 'Expected ownership must be at least one month.')
      .max(MAX_OWNERSHIP_MONTHS, 'That is longer than this app plans for.'),

    cooldownDays: z
      .number({ error: 'Choose a reflection period.' })
      .int()
      .min(MIN_COOLDOWN_DAYS, `A reflection period is at least ${MIN_COOLDOWN_DAYS} day.`)
      .max(MAX_COOLDOWN_DAYS, `A reflection period is at most ${MAX_COOLDOWN_DAYS} days.`),

    reasonTags: z.array(z.string()),
    notes: z.string().trim().max(500, 'Keep notes under 500 characters.').nullable(),
  })
  // A custom frequency without a rate would silently produce no estimate at all,
  // so it is caught here rather than surfacing later as a missing figure.
  .refine(
    (values) => values.expectedUsageFrequency !== 'custom' || values.customUsesPerMonth != null,
    {
      path: ['customUsesPerMonth'],
      message: 'Enter how many times per month you expect to use it.',
    },
  );

/** What a valid form produces — the price is a number by the time it gets here. */
export type WishlistItemFormValues = z.infer<typeof wishlistItemSchema>;

/** What the form holds while it is being filled in: an empty price is `null`. */
export type WishlistItemFormInput = z.input<typeof wishlistItemSchema>;

/** Reason tags offered on the form. Free text is intentionally not supported in V1. */
export const REASON_TAGS: readonly string[] = [
  'Replaces something',
  'Work',
  'Hobby',
  'Health',
  'Long-term use',
  'Been wanting it',
  'Gift',
  'Upgrade',
];

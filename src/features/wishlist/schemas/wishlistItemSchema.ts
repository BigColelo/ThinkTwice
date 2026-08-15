import type { TFunction } from 'i18next';
import { z } from 'zod';

import { MAX_OWNERSHIP_MONTHS, MIN_OWNERSHIP_MONTHS } from '@/constants/ownership';
import { USAGE_FREQUENCY_IDS } from '@/constants/usagePresets';
import { MAX_COOLDOWN_DAYS, MIN_COOLDOWN_DAYS } from '@/domain';
import { requiredAmount } from '@/features/forms/requiredAmount';

/**
 * Validation for the "something I want to buy" form.
 *
 * Built from `t` rather than declared once at module scope: a validation message
 * is copy like any other, and a schema evaluated at import time would keep
 * whichever language happened to be active when the module first loaded. The
 * form memoises the result, so the schema is rebuilt on a language change and
 * not on every keystroke.
 */

const MAX_PRICE_CENTS = 100_000_000;

export function buildWishlistItemSchema(t: TFunction) {
  const priceCents = z
    .number({ error: t('validation.wishlist.priceRequired') })
    .int()
    .positive(t('validation.wishlist.pricePositive'))
    .max(MAX_PRICE_CENTS, t('validation.wishlist.priceTooLarge'));

  return (
    z
      .object({
        name: z
          .string()
          .trim()
          .min(1, t('validation.wishlist.nameRequired'))
          .max(80, t('validation.nameTooLong80')),
        // A price of zero is refused rather than accepted as "unknown": it would
        // travel through the impact calculation as a real figure and label an item
        // whose price was never entered as low impact, 0% of income. In this app
        // what cannot be computed is `null`, never zero — which is also how the
        // field itself starts, empty rather than at zero.
        priceCents: requiredAmount(priceCents),
        categoryId: z.string().min(1, t('validation.categoryRequired')),
        imageUri: z.string().nullable(),

        expectedUsageFrequency: z.enum(USAGE_FREQUENCY_IDS),
        customUsesPerMonth: z
          .number()
          .positive(t('validation.usesRequired'))
          .max(1000, t('validation.usesTooMany'))
          .nullable(),
        expectedOwnershipMonths: z
          .number({ error: t('validation.wishlist.ownershipRequired') })
          .int()
          .min(MIN_OWNERSHIP_MONTHS, t('validation.ownershipTooShort'))
          .max(MAX_OWNERSHIP_MONTHS, t('validation.ownershipTooLong')),

        cooldownDays: z
          .number({ error: t('validation.wishlist.cooldownRequired') })
          .int()
          .min(
            MIN_COOLDOWN_DAYS,
            t('validation.wishlist.cooldownTooShort', { count: MIN_COOLDOWN_DAYS }),
          )
          .max(
            MAX_COOLDOWN_DAYS,
            t('validation.wishlist.cooldownTooLong', { count: MAX_COOLDOWN_DAYS }),
          ),

        notes: z.string().trim().max(500, t('validation.wishlist.notesTooLong')).nullable(),
      })
      // A custom frequency without a rate would silently produce no estimate at all,
      // so it is caught here rather than surfacing later as a missing figure.
      .refine(
        (values) => values.expectedUsageFrequency !== 'custom' || values.customUsesPerMonth != null,
        {
          path: ['customUsesPerMonth'],
          message: t('validation.usesRequired'),
        },
      )
  );
}

export type WishlistItemSchema = ReturnType<typeof buildWishlistItemSchema>;

/** What a valid form produces — the price is a number by the time it gets here. */
export type WishlistItemFormValues = z.infer<WishlistItemSchema>;

/** What the form holds while it is being filled in: an empty price is `null`. */
export type WishlistItemFormInput = z.input<WishlistItemSchema>;

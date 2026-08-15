import type { TFunction } from 'i18next';
import { z } from 'zod';

import { MAX_OWNERSHIP_MONTHS, MIN_OWNERSHIP_MONTHS } from '@/constants/ownership';
import { USAGE_FREQUENCY_IDS } from '@/constants/usagePresets';
import { requiredAmount } from '@/features/forms/requiredAmount';
import type { ExpenseType } from '@/types/domain';
import { parseIsoDate, toIsoDate } from '@/utils/dates';

/**
 * Validation for the "something I already own" and "add expense" forms.
 *
 * Built from `t` for the reason explained in `wishlistItemSchema`: a message the
 * user reads follows the language they chose, so the schema is a function of the
 * translation rather than a module-level constant.
 */

const MAX_AMOUNT_CENTS = 100_000_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The fields of the owned-purchase form, before the cross-field rule below.
 *
 * Kept as a plain object so a subset can be picked from it: `.refine` produces a
 * schema that no longer has `.pick`.
 */
function ownedPurchaseFields(t: TFunction) {
  const purchasePriceCents = z
    .number({ error: t('validation.purchase.priceRequired') })
    .int()
    .min(0, t('validation.purchase.priceNegative'))
    .max(MAX_AMOUNT_CENTS, t('validation.purchase.priceTooLarge'));

  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t('validation.purchase.nameRequired'))
      .max(80, t('validation.nameTooLong80')),
    purchasePriceCents: requiredAmount(purchasePriceCents),
    purchaseDate: z
      .string()
      .regex(ISO_DATE, t('validation.purchase.dateRequired'))
      // A day that does not exist is not caught by parsing: both `Date.parse` and
      // `parseIsoDate` roll 2026-02-31 into March, which would quietly shift how long
      // the item has been owned. Round-tripping the parsed date back to text is what
      // actually rejects it.
      .refine((value) => {
        const parsed = parseIsoDate(value);
        return parsed != null && toIsoDate(parsed) === value;
      }, t('validation.purchase.dateInvalid')),
    categoryId: z.string().min(1, t('validation.categoryRequired')),
    imageUri: z.string().nullable(),
    currentResaleValueCents: z
      .number()
      .int()
      .min(0, t('validation.purchase.resaleNegative'))
      .max(MAX_AMOUNT_CENTS, t('validation.purchase.resaleTooLarge'))
      .nullable(),

    // The expectation is optional here, unlike on a wishlist item: something bought
    // long ago may have been recorded without one, and inventing a forecast after
    // the fact would be worse than leaving it unset.
    expectedUsageFrequency: z.enum(USAGE_FREQUENCY_IDS).nullable(),
    customUsesPerMonth: z
      .number()
      .positive(t('validation.usesRequired'))
      .max(1000, t('validation.usesTooMany'))
      .nullable(),
    expectedOwnershipMonths: z
      .number()
      .int()
      .min(MIN_OWNERSHIP_MONTHS, t('validation.ownershipTooShort'))
      .max(MAX_OWNERSHIP_MONTHS, t('validation.ownershipTooLong'))
      .nullable(),
  });
}

export function buildOwnedPurchaseSchema(t: TFunction) {
  return ownedPurchaseFields(t).refine(
    // Same rule as the wishlist form: a custom frequency without a rate would leave
    // the comparison silently empty rather than visibly wrong.
    (values) => values.expectedUsageFrequency !== 'custom' || values.customUsesPerMonth != null,
    {
      path: ['customUsesPerMonth'],
      message: t('validation.usesRequired'),
    },
  );
}

export type OwnedPurchaseSchema = ReturnType<typeof buildOwnedPurchaseSchema>;

/** What a valid form produces — the price is a number by the time it gets here. */
export type OwnedPurchaseFormValues = z.infer<OwnedPurchaseSchema>;

/** What the form holds while it is being filled in: an empty price is `null`. */
export type OwnedPurchaseFormInput = z.input<OwnedPurchaseSchema>;

/**
 * The two things a wishlist item cannot know when it becomes a purchase: when it
 * was bought and what was actually paid. Picked from the fields above so both
 * flows validate a price and a date by exactly the same rules.
 */
export function buildConfirmedPurchaseSchema(t: TFunction) {
  return ownedPurchaseFields(t).pick({ purchaseDate: true, purchasePriceCents: true });
}

export type ConfirmedPurchaseSchema = ReturnType<typeof buildConfirmedPurchaseSchema>;

export type ConfirmedPurchaseFormValues = z.infer<ConfirmedPurchaseSchema>;

export type ConfirmedPurchaseFormInput = z.input<ConfirmedPurchaseSchema>;

export const EXPENSE_TYPES = [
  'accessory',
  'maintenance',
  'repair',
  'upgrade',
  'other',
] as const satisfies readonly ExpenseType[];

export function buildPurchaseExpenseSchema(t: TFunction) {
  const expenseAmountCents = z
    .number({ error: t('validation.amountRequired') })
    .int()
    .min(0, t('validation.amountNegative'))
    .max(MAX_AMOUNT_CENTS, t('validation.amountTooLarge'));

  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t('validation.purchase.expenseNameRequired'))
      .max(60, t('validation.nameTooLong60')),
    amountCents: requiredAmount(expenseAmountCents),
    expenseType: z.enum(EXPENSE_TYPES),
    date: z.string().regex(ISO_DATE, t('validation.purchase.expenseDateRequired')),
  });
}

export type PurchaseExpenseSchema = ReturnType<typeof buildPurchaseExpenseSchema>;

/** What a valid form produces — the amount is a number by the time it gets here. */
export type PurchaseExpenseFormValues = z.infer<PurchaseExpenseSchema>;

/** What the form holds while it is being filled in: an empty amount is `null`. */
export type PurchaseExpenseFormInput = z.input<PurchaseExpenseSchema>;

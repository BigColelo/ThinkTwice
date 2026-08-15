import { z } from 'zod';

import { MAX_OWNERSHIP_MONTHS, MIN_OWNERSHIP_MONTHS } from '@/constants/ownership';
import { USAGE_FREQUENCY_IDS } from '@/constants/usagePresets';
import { requiredAmount } from '@/features/forms/requiredAmount';
import type { ExpenseType } from '@/types/domain';
import { parseIsoDate, toIsoDate } from '@/utils/dates';

/** Validation for the "something I already own" and "add expense" forms. */

const MAX_AMOUNT_CENTS = 100_000_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const purchasePriceCents = z
  .number({ error: 'Enter what you paid.' })
  .int()
  .min(0, 'The price cannot be negative.')
  .max(MAX_AMOUNT_CENTS, 'That price looks too large.');

/**
 * The fields of the owned-purchase form, before the cross-field rule below.
 *
 * Kept as a plain object so a subset can be picked from it: `.refine` produces a
 * schema that no longer has `.pick`.
 */
const ownedPurchaseFields = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give this item a name.')
    .max(80, 'Keep the name under 80 characters.'),
  purchasePriceCents: requiredAmount(purchasePriceCents),
  purchaseDate: z
    .string()
    .regex(ISO_DATE, 'Choose a purchase date.')
    // A day that does not exist is not caught by parsing: both `Date.parse` and
    // `parseIsoDate` roll 2026-02-31 into March, which would quietly shift how long
    // the item has been owned. Round-tripping the parsed date back to text is what
    // actually rejects it.
    .refine((value) => {
      const parsed = parseIsoDate(value);
      return parsed != null && toIsoDate(parsed) === value;
    }, 'Choose a valid purchase date.'),
  categoryId: z.string().min(1, 'Choose a category.'),
  imageUri: z.string().nullable(),
  currentResaleValueCents: z
    .number()
    .int()
    .min(0, 'A resale value cannot be negative.')
    .max(MAX_AMOUNT_CENTS, 'That value looks too large.')
    .nullable(),

  // The expectation is optional here, unlike on a wishlist item: something bought
  // long ago may have been recorded without one, and inventing a forecast after
  // the fact would be worse than leaving it unset.
  expectedUsageFrequency: z.enum(USAGE_FREQUENCY_IDS).nullable(),
  customUsesPerMonth: z
    .number()
    .positive('Enter how many times per month you expect to use it.')
    .max(1000, 'That looks like too many uses per month.')
    .nullable(),
  expectedOwnershipMonths: z
    .number()
    .int()
    .min(MIN_OWNERSHIP_MONTHS, 'Expected ownership must be at least one month.')
    .max(MAX_OWNERSHIP_MONTHS, 'That is longer than this app plans for.')
    .nullable(),
});

export const ownedPurchaseSchema = ownedPurchaseFields.refine(
  // Same rule as the wishlist form: a custom frequency without a rate would leave
  // the comparison silently empty rather than visibly wrong.
  (values) => values.expectedUsageFrequency !== 'custom' || values.customUsesPerMonth != null,
  {
    path: ['customUsesPerMonth'],
    message: 'Enter how many times per month you expect to use it.',
  },
);

/** What a valid form produces — the price is a number by the time it gets here. */
export type OwnedPurchaseFormValues = z.infer<typeof ownedPurchaseSchema>;

/** What the form holds while it is being filled in: an empty price is `null`. */
export type OwnedPurchaseFormInput = z.input<typeof ownedPurchaseSchema>;

/**
 * The two things a wishlist item cannot know when it becomes a purchase: when it
 * was bought and what was actually paid. Picked from the fields above so both
 * flows validate a price and a date by exactly the same rules.
 */
export const confirmedPurchaseSchema = ownedPurchaseFields.pick({
  purchaseDate: true,
  purchasePriceCents: true,
});

export type ConfirmedPurchaseFormValues = z.infer<typeof confirmedPurchaseSchema>;

export type ConfirmedPurchaseFormInput = z.input<typeof confirmedPurchaseSchema>;

const EXPENSE_TYPES = [
  'accessory',
  'maintenance',
  'repair',
  'upgrade',
  'other',
] as const satisfies readonly ExpenseType[];

const expenseAmountCents = z
  .number({ error: 'Enter an amount.' })
  .int()
  .min(0, 'The amount cannot be negative.')
  .max(MAX_AMOUNT_CENTS, 'That amount looks too large.');

export const purchaseExpenseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give this expense a name.')
    .max(60, 'Keep the name under 60 characters.'),
  amountCents: requiredAmount(expenseAmountCents),
  expenseType: z.enum(EXPENSE_TYPES),
  date: z.string().regex(ISO_DATE, 'Choose a date.'),
});

/** What a valid form produces — the amount is a number by the time it gets here. */
export type PurchaseExpenseFormValues = z.infer<typeof purchaseExpenseSchema>;

/** What the form holds while it is being filled in: an empty amount is `null`. */
export type PurchaseExpenseFormInput = z.input<typeof purchaseExpenseSchema>;

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  accessory: 'Accessory',
  maintenance: 'Maintenance',
  repair: 'Repair',
  upgrade: 'Upgrade',
  other: 'Other',
};

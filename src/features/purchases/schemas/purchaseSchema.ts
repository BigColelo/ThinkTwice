import { z } from 'zod';

import type { ExpenseType } from '@/types/domain';

/** Validation for the "something I already own" and "add expense" forms. */

const MAX_AMOUNT_CENTS = 100_000_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const ownedPurchaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give this item a name.')
    .max(80, 'Keep the name under 80 characters.'),
  purchasePriceCents: z
    .number({ error: 'Enter what you paid.' })
    .int()
    .min(0, 'The price cannot be negative.')
    .max(MAX_AMOUNT_CENTS, 'That price looks too large.'),
  purchaseDate: z
    .string()
    .regex(ISO_DATE, 'Choose a purchase date.')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Choose a valid purchase date.'),
  categoryId: z.string().min(1, 'Choose a category.'),
  imageUri: z.string().nullable(),
  currentResaleValueCents: z
    .number()
    .int()
    .min(0, 'A resale value cannot be negative.')
    .max(MAX_AMOUNT_CENTS, 'That value looks too large.')
    .nullable(),
});

export type OwnedPurchaseFormValues = z.infer<typeof ownedPurchaseSchema>;

const EXPENSE_TYPES = [
  'accessory',
  'maintenance',
  'repair',
  'upgrade',
  'other',
] as const satisfies readonly ExpenseType[];

export const purchaseExpenseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give this expense a name.')
    .max(60, 'Keep the name under 60 characters.'),
  amountCents: z
    .number({ error: 'Enter an amount.' })
    .int()
    .min(0, 'The amount cannot be negative.')
    .max(MAX_AMOUNT_CENTS, 'That amount looks too large.'),
  expenseType: z.enum(EXPENSE_TYPES),
  date: z.string().regex(ISO_DATE, 'Choose a date.'),
});

export type PurchaseExpenseFormValues = z.infer<typeof purchaseExpenseSchema>;

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  accessory: 'Accessory',
  maintenance: 'Maintenance',
  repair: 'Repair',
  upgrade: 'Upgrade',
  other: 'Other',
};

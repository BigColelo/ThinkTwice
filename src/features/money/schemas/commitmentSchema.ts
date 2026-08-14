import { z } from 'zod';

import type { CommitmentFrequency } from '@/types/domain';

/**
 * Validation for the recurring-commitment form.
 *
 * TypeScript cannot check what a user types, so every form has a runtime schema
 * here. Messages are written for the person reading them, not for a developer.
 */

const FREQUENCIES = [
  'monthly',
  'every_two_months',
  'quarterly',
  'semiannual',
  'annual',
] as const satisfies readonly CommitmentFrequency[];

/** One million euro a month is well beyond any real commitment; it catches slips. */
const MAX_AMOUNT_CENTS = 100_000_000;

export const commitmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give this commitment a name.')
    .max(60, 'Keep the name under 60 characters.'),
  amountCents: z
    .number({ error: 'Enter an amount.' })
    .int()
    .min(0, 'The amount cannot be negative.')
    .max(MAX_AMOUNT_CENTS, 'That amount looks too large.'),
  frequency: z.enum(FREQUENCIES),
  categoryId: z.string().min(1, 'Choose a category.'),
  /** Paused commitments stay in the list but stop counting towards the month. */
  isActive: z.boolean(),
});

export type CommitmentFormValues = z.infer<typeof commitmentSchema>;

/** Validation for the income and savings-target fields on the Money screen. */
export const monthlyIncomeSchema = z.object({
  monthlyNetIncomeCents: z
    .number({ error: 'Enter your monthly net income.' })
    .int()
    .min(0, 'Income cannot be negative.')
    .max(MAX_AMOUNT_CENTS, 'That amount looks too large.'),
  monthlySavingsTargetCents: z
    .number()
    .int()
    .min(0, 'A savings target cannot be negative.')
    .max(MAX_AMOUNT_CENTS, 'That amount looks too large.')
    .nullable(),
});

export type MonthlyIncomeFormValues = z.infer<typeof monthlyIncomeSchema>;

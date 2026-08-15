import type { TFunction } from 'i18next';
import { z } from 'zod';

import { requiredAmount } from '@/features/forms/requiredAmount';
import type { CommitmentFrequency } from '@/types/domain';

/**
 * Validation for the recurring-commitment form.
 *
 * TypeScript cannot check what a user types, so every form has a runtime schema
 * here. Messages are written for the person reading them, not for a developer —
 * which is also why the schema is built from `t` rather than declared once: the
 * person reading them chose a language.
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

export function buildCommitmentSchema(t: TFunction) {
  const amountCents = z
    .number({ error: t('validation.amountRequired') })
    .int()
    .min(0, t('validation.amountNegative'))
    .max(MAX_AMOUNT_CENTS, t('validation.amountTooLarge'));

  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t('validation.money.nameRequired'))
      .max(60, t('validation.nameTooLong60')),
    amountCents: requiredAmount(amountCents),
    frequency: z.enum(FREQUENCIES),
    categoryId: z.string().min(1, t('validation.categoryRequired')),
    /** Paused commitments stay in the list but stop counting towards the month. */
    isActive: z.boolean(),
  });
}

export type CommitmentSchema = ReturnType<typeof buildCommitmentSchema>;

/** What a valid form produces — the amount is a number by the time it gets here. */
export type CommitmentFormValues = z.infer<CommitmentSchema>;

/** What the form holds while it is being filled in: an empty amount is `null`. */
export type CommitmentFormInput = z.input<CommitmentSchema>;

/** Validation for the income and savings-target fields on the Money screen. */
export function buildMonthlyIncomeSchema(t: TFunction) {
  return z.object({
    monthlyNetIncomeCents: z
      .number({ error: t('validation.money.incomeRequired') })
      .int()
      .min(0, t('validation.money.incomeNegative'))
      .max(MAX_AMOUNT_CENTS, t('validation.amountTooLarge')),
    monthlySavingsTargetCents: z
      .number()
      .int()
      .min(0, t('validation.money.savingsNegative'))
      .max(MAX_AMOUNT_CENTS, t('validation.amountTooLarge'))
      .nullable(),
  });
}

export type MonthlyIncomeSchema = ReturnType<typeof buildMonthlyIncomeSchema>;

export type MonthlyIncomeFormValues = z.infer<MonthlyIncomeSchema>;

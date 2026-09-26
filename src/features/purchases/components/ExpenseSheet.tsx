import { zodResolver } from '@hookform/resolvers/zod';
import React, { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { DateField } from '@/components/ui/DateField';
import { InlineError } from '@/components/ui/InlineError';
import { MoneyField } from '@/components/ui/MoneyField';
import { TextField } from '@/components/ui/TextField';
import { EXPENSE_TYPES } from '@/constants/enums';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import { useResetOnOpen } from '@/features/forms/useResetOnOpen';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { PurchaseExpense } from '@/types/domain';
import { todayIsoDate } from '@/utils/dates';

import {
  buildPurchaseExpenseSchema,
  type PurchaseExpenseFormInput,
  type PurchaseExpenseFormValues,
} from '../schemas/purchaseSchema';

/**
 * Money spent on an item after buying it — added, or corrected.
 *
 * A bottom sheet built on React Native's own `Modal`: the form is four fields and
 * needs no gesture-driven sheet library to be pleasant.
 *
 * Editing exists because these amounts feed the real cost, and a mistyped one
 * should be fixable rather than deleted and re-entered. Deleting is offered here
 * too, so that tapping a row opens it — which is what a row that looks tappable
 * ought to do — instead of destroying it.
 */

export function ExpenseSheet({
  expense,
  visible,
  onClose,
  onSubmit,
  onDelete,
}: {
  /** The expense being corrected. Absent when adding one. */
  expense?: PurchaseExpense;
  visible: boolean;
  onClose: () => void;
  /** Rejecting shows the sheet's own error; resolving is the caller's to act on. */
  onSubmit: (values: PurchaseExpenseFormValues) => Promise<void>;
  /** Offered only when correcting an existing expense. */
  onDelete?: () => Promise<void>;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  // One per action, so the two buttons spin independently and each failure says
  // which of them failed.
  const save = useAsyncAction();
  const removal = useAsyncAction();

  // Rebuilt when the language changes: the messages it carries are copy.
  const schema = useMemo(() => buildPurchaseExpenseSchema(t), [t]);

  const initialValues = (): PurchaseExpenseFormInput => ({
    name: expense?.name ?? '',
    // Empty rather than zero: the amount is the user's to enter, and a leading
    // zero cannot be typed over.
    amountCents: expense?.amountCents ?? null,
    expenseType: expense?.expenseType ?? 'accessory',
    date: expense?.date ?? todayIsoDate(),
  });

  const { control, handleSubmit, reset } = useForm<
    PurchaseExpenseFormInput,
    unknown,
    PurchaseExpenseFormValues
  >({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: initialValues(),
  });

  // After an expense is added the caller closes the sheet without remounting it,
  // so the next "Add expense" would otherwise open on the one just saved.
  useResetOnOpen(visible, reset, initialValues);

  const isBusy = save.isRunning || removal.isRunning;
  const actionError = save.error ?? removal.error;

  const close = (): void => {
    reset();
    save.reset();
    removal.reset();
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    await save.run(() => onSubmit(values), {
      errorMessage: t('purchases.expenses.saveError'),
    });
  });

  const remove = async (): Promise<void> => {
    if (!onDelete) return;
    await removal.run(onDelete, { errorMessage: t('purchases.expenses.removeError') });
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      {/* The heading names the thing, the button names the action — saying
                "Add expense" twice would leave the button doing no work. */}
      <AppText variant="title" accessibilityRole="header">
        {expense ? t('purchases.expenses.editTitle') : t('purchases.expenses.newTitle')}
      </AppText>
      <AppText variant="caption" color="secondary">
        {t('purchases.expenses.sheetDescription')}
      </AppText>

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label={t('purchases.expenses.nameLabel')}
            required
            placeholder={t('purchases.expenses.namePlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="sentences"
          />
        )}
      />

      <Controller
        control={control}
        name="amountCents"
        render={({ field, fieldState }) => (
          <MoneyField
            label={t('purchases.expenses.amountLabel')}
            required
            valueCents={field.value}
            onChangeCents={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="expenseType"
        render={({ field, fieldState }) => (
          <ChipSelect
            label={t('purchases.expenses.typeLabel')}
            options={EXPENSE_TYPES.map((value) => ({
              value,
              label: t(`purchases.expenses.type.${value}`),
            }))}
            value={field.value}
            onChange={(value) => field.onChange(value)}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="date"
        render={({ field, fieldState }) => (
          <DateField
            label={t('purchases.expenses.dateLabel')}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      <InlineError message={actionError} />

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button
          label={t('common.cancel')}
          variant="secondary"
          onPress={close}
          style={{ flex: 1 }}
          disabled={isBusy}
        />
        <Button
          label={expense ? t('purchases.expenses.saveChanges') : t('purchases.expenses.add')}
          onPress={submit}
          loading={save.isRunning}
          disabled={isBusy}
          style={{ flex: 1 }}
        />
      </View>

      {onDelete ? (
        <Button
          label={t('purchases.expenses.remove')}
          variant="destructive"
          size="md"
          onPress={remove}
          loading={removal.isRunning}
          disabled={isBusy}
        />
      ) : null}
    </BottomSheet>
  );
}

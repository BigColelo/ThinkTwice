import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { DateField } from '@/components/ui/DateField';
import { MoneyField } from '@/components/ui/MoneyField';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/theme';
import type { PurchaseExpense } from '@/types/domain';
import { todayIsoDate } from '@/utils/dates';

import {
  EXPENSE_TYPE_LABELS,
  purchaseExpenseSchema,
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
  const insets = useSafeAreaInsets();

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<
    PurchaseExpenseFormInput,
    unknown,
    PurchaseExpenseFormValues
  >({
    resolver: zodResolver(purchaseExpenseSchema),
    mode: 'onTouched',
    defaultValues: {
      name: expense?.name ?? '',
      // Empty rather than zero: the amount is the user's to enter, and a leading
      // zero cannot be typed over.
      amountCents: expense?.amountCents ?? null,
      expenseType: expense?.expenseType ?? 'accessory',
      date: expense?.date ?? todayIsoDate(),
    },
  });

  const isBusy = isSaving || isDeleting;

  const close = (): void => {
    reset();
    setSaveError(null);
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSubmit(values);
    } catch {
      setSaveError('This expense could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  });

  const remove = async (): Promise<void> => {
    if (!onDelete) return;
    setIsDeleting(true);
    setSaveError(null);
    try {
      await onDelete();
    } catch {
      setSaveError('This expense could not be removed. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={close}
      accessibilityViewIsModal
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.scrim }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={close}
          style={{ flex: 1 }}
        />

        <View
          style={{
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: theme.radius.xxl,
            borderTopRightRadius: theme.radius.xxl,
            paddingTop: theme.spacing.md,
            paddingBottom: insets.bottom + theme.spacing.md,
            maxHeight: '90%',
          }}
        >
          <View
            // Grabber, purely visual — the close affordances are the scrim and Cancel.
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.borderStrong,
              marginBottom: theme.spacing.md,
            }}
          />

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: theme.screenPadding,
              gap: theme.spacing.md,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {/* The heading names the thing, the button names the action — saying
                "Add expense" twice would leave the button doing no work. */}
            <AppText variant="title" accessibilityRole="header">
              {expense ? 'Edit expense' : 'New expense'}
            </AppText>
            <AppText variant="caption" color="secondary">
              Accessories, maintenance, repairs — anything you spent on this item after buying it.
            </AppText>

            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  label="What was it?"
                  required
                  placeholder="Extra battery, service, case…"
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
                  label="Amount"
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
                  label="Type"
                  options={Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => ({
                    value,
                    label,
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
                  label="Date"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            {saveError ? (
              <AppText variant="caption" color="danger" accessibilityRole="alert">
                {saveError}
              </AppText>
            ) : null}

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={close}
                style={{ flex: 1 }}
                disabled={isBusy}
              />
              <Button
                label={expense ? 'Save changes' : 'Add expense'}
                onPress={submit}
                loading={isSaving}
                disabled={isBusy}
                style={{ flex: 1 }}
              />
            </View>

            {onDelete ? (
              <Button
                label="Remove expense"
                variant="destructive"
                size="md"
                onPress={remove}
                loading={isDeleting}
                disabled={isBusy}
              />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

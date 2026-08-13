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
import { useRepositories } from '@/db/DatabaseProvider';
import { addPurchaseExpense } from '@/features/purchases/services/purchaseActions';
import { useTheme } from '@/theme';
import { todayIsoDate } from '@/utils/dates';

import {
  EXPENSE_TYPE_LABELS,
  purchaseExpenseSchema,
  type PurchaseExpenseFormValues,
} from '../schemas/purchaseSchema';

/**
 * Adding money spent on an item after buying it.
 *
 * A bottom sheet built on React Native's own `Modal` — the form is four fields
 * and needs no gesture-driven sheet library to be pleasant.
 */

export function AddExpenseSheet({
  purchaseId,
  visible,
  onClose,
}: {
  purchaseId: string;
  visible: boolean;
  onClose: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const repositories = useRepositories();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<PurchaseExpenseFormValues>({
    resolver: zodResolver(purchaseExpenseSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      amountCents: 0,
      expenseType: 'accessory',
      date: todayIsoDate(),
    },
  });

  const close = (): void => {
    reset();
    setSaveError(null);
    onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await addPurchaseExpense(repositories, { purchaseId, ...values });
      close();
    } catch {
      setSaveError('This expense could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  });

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
            <AppText variant="title" accessibilityRole="header">
              Add expense
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
                  onChangeCents={(cents) => field.onChange(cents ?? 0)}
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
                disabled={isSaving}
              />
              <Button
                label="Add expense"
                onPress={onSubmit}
                loading={isSaving}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

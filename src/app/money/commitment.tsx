import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { MoneyField } from '@/components/ui/MoneyField';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { COMMITMENT_CATEGORIES, DEFAULT_COMMITMENT_CATEGORY_ID } from '@/constants/categories';
import { COMMITMENT_FREQUENCIES, DEFAULT_COMMITMENT_FREQUENCY } from '@/constants/frequencies';
import { useRepositories } from '@/db/DatabaseProvider';
import { invalidate } from '@/db/dataRevisions';
import {
  calculateAnnualCommitmentEquivalent,
  calculateMonthlyCommitmentEquivalent,
} from '@/domain';
import {
  commitmentSchema,
  type CommitmentFormValues,
} from '@/features/money/schemas/commitmentSchema';
import { useTheme } from '@/theme';
import { confirm } from '@/utils/confirm';

/**
 * Add or edit a recurring commitment.
 *
 * One screen serves both, keyed off an optional `id` query parameter — the
 * fields and validation are identical, so splitting them would only duplicate
 * the form.
 */
export default function CommitmentFormScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const repositories = useRepositories();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isEditing = Boolean(id);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<CommitmentFormValues>({
    resolver: zodResolver(commitmentSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      amountCents: 0,
      frequency: DEFAULT_COMMITMENT_FREQUENCY,
      categoryId: DEFAULT_COMMITMENT_CATEGORY_ID,
    },
  });

  const values = useWatch({ control });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async (): Promise<void> => {
      const commitment = await repositories.commitments.findById(id);
      if (cancelled) return;
      if (commitment) {
        reset({
          name: commitment.name,
          amountCents: commitment.amountCents,
          frequency: commitment.frequency,
          categoryId: commitment.categoryId,
        });
      }
      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, repositories, reset]);

  const onSubmit = handleSubmit(async (formValues) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (id) {
        await repositories.commitments.update(id, formValues);
      } else {
        await repositories.commitments.create(formValues);
      }
      invalidate('commitments');
      router.back();
    } catch {
      setSaveError('This commitment could not be saved. Please try again.');
      setIsSaving(false);
    }
  });

  const handleDelete = async (): Promise<void> => {
    if (!id) return;
    const confirmed = await confirm({
      title: 'Delete this commitment?',
      message: 'It will no longer be subtracted from your monthly income.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;

    await repositories.commitments.remove(id);
    invalidate('commitments');
    router.back();
  };

  const amountCents = values.amountCents ?? 0;
  const frequency = values.frequency ?? DEFAULT_COMMITMENT_FREQUENCY;
  const monthlyEquivalent = calculateMonthlyCommitmentEquivalent({ amountCents, frequency });
  const annualEquivalent = calculateAnnualCommitmentEquivalent({ amountCents, frequency });

  return (
    <>
      <ScreenHeader
        title={isEditing ? 'Edit commitment' : 'Add commitment'}
        textAction={{ label: 'Cancel', onPress: () => router.back() }}
      />

      <Screen
        scroll
        avoidKeyboard
        footer={
          <Button
            label={isEditing ? 'Save changes' : 'Add commitment'}
            onPress={onSubmit}
            loading={isSaving}
            disabled={isLoading}
          />
        }
      >
        <View style={{ gap: theme.spacing.md }}>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                label="Name"
                required
                placeholder="Rent, Netflix, gym…"
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
                hint="Enter what you are billed, not a monthly average."
                valueCents={field.value}
                onChangeCents={(cents) => field.onChange(cents ?? 0)}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="frequency"
            render={({ field, fieldState }) => (
              <ChipSelect
                label="How often are you billed?"
                options={COMMITMENT_FREQUENCIES.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="categoryId"
            render={({ field, fieldState }) => (
              <ChipSelect
                label="Category"
                options={COMMITMENT_CATEGORIES.map((category) => ({
                  value: category.id,
                  label: category.label,
                  icon: category.icon,
                }))}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          {frequency !== 'monthly' && amountCents > 0 ? (
            <Card variant="muted" padding={theme.spacing.md}>
              <AppText variant="label" color="secondary">
                Monthly equivalent
              </AppText>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: theme.spacing.xs,
                  marginTop: theme.spacing.xxs,
                }}
              >
                <MoneyValue cents={monthlyEquivalent} variant="metricSmall" suffix=" / month" />
              </View>
              <MoneyValue
                cents={annualEquivalent}
                variant="caption"
                color="secondary"
                suffix=" / year"
                style={{ marginTop: 2 }}
              />
            </Card>
          ) : null}

          {saveError ? (
            <AppText variant="caption" color="danger" accessibilityRole="alert">
              {saveError}
            </AppText>
          ) : null}

          {isEditing ? (
            <Button
              label="Delete commitment"
              variant="destructive"
              size="md"
              onPress={handleDelete}
              style={{ marginTop: theme.spacing.sm }}
            />
          ) : null}
        </View>
      </Screen>
    </>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { DateField } from '@/components/ui/DateField';
import { MoneyField } from '@/components/ui/MoneyField';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { DEFAULT_PURCHASE_CATEGORY_ID, PURCHASE_CATEGORIES } from '@/constants/categories';
import { OWNERSHIP_PRESETS } from '@/constants/ownership';
import { USAGE_PRESETS } from '@/constants/usagePresets';
import type { NewPurchase } from '@/db/repositories';
import { ImagePickerField } from '@/features/images/ImagePickerField';
import {
  ownedPurchaseSchema,
  type OwnedPurchaseFormValues,
} from '@/features/purchases/schemas/purchaseSchema';
import { useTheme } from '@/theme';
import type { Purchase } from '@/types/domain';
import { todayIsoDate } from '@/utils/dates';

/**
 * The form behind both "something I already own" and editing an owned item.
 *
 * Short by design: what it is, what it cost, when it arrived. Uses, expenses and
 * resale value are recorded from the detail screen, where they belong.
 *
 * The expectation at the end is optional, and asked for here rather than on the
 * detail screen on purpose: it is what the user thought at the time, and a
 * forecast typed in months after the fact would be a fabricated memory rather
 * than something to compare against — the app computes the actual rate by itself.
 *
 * It lives here rather than in the route so both screens share one definition of
 * the fields and one set of tests; the caller supplies the header, decides what
 * saving means and where to go afterwards.
 */

export function OwnedPurchaseForm({
  purchase,
  submitLabel,
  onSubmit,
}: {
  /** The purchase being edited. Absent when adding one. */
  purchase?: Purchase;
  submitLabel: string;
  /** Rejecting shows the form's own error; resolving is the caller's to act on. */
  onSubmit: (values: NewPurchase) => Promise<void>;
}): React.ReactElement {
  const theme = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { control, handleSubmit, setValue, formState } = useForm<OwnedPurchaseFormValues>({
    resolver: zodResolver(ownedPurchaseSchema),
    mode: 'onTouched',
    defaultValues: {
      name: purchase?.name ?? '',
      purchasePriceCents: purchase?.purchasePriceCents ?? 0,
      purchaseDate: purchase?.purchaseDate ?? todayIsoDate(),
      categoryId: purchase?.categoryId ?? DEFAULT_PURCHASE_CATEGORY_ID,
      imageUri: purchase?.imageUri ?? null,
      currentResaleValueCents: purchase?.currentResaleValueCents ?? null,
      expectedUsageFrequency: purchase?.expectedUsageFrequency ?? null,
      customUsesPerMonth: purchase?.customUsesPerMonth ?? null,
      expectedOwnershipMonths: purchase?.expectedOwnershipMonths ?? null,
    },
  });

  const values = useWatch({ control });

  const submit = handleSubmit(async (formValues) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSubmit({
        name: formValues.name,
        purchasePriceCents: formValues.purchasePriceCents,
        purchaseDate: formValues.purchaseDate,
        categoryId: formValues.categoryId,
        imageUri: formValues.imageUri,
        currentResaleValueCents: formValues.currentResaleValueCents,
        expectedUsageFrequency: formValues.expectedUsageFrequency,
        customUsesPerMonth: formValues.customUsesPerMonth,
        expectedOwnershipMonths: formValues.expectedOwnershipMonths,
      });
    } catch {
      setSaveError('This purchase could not be saved. Please try again.');
      setIsSaving(false);
    }
  });

  return (
    <Screen
      scroll
      avoidKeyboard
      footer={
        <Button
          label={submitLabel}
          onPress={submit}
          loading={isSaving}
          disabled={formState.isSubmitting}
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
              placeholder="What do you own?"
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
          name="purchasePriceCents"
          render={({ field, fieldState }) => (
            <MoneyField
              label="Purchase price"
              required
              valueCents={field.value}
              onChangeCents={(cents) => field.onChange(cents ?? 0)}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="purchaseDate"
          render={({ field, fieldState }) => (
            <DateField
              label="Purchase date"
              required
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              hint="Used to work out how long you have owned it."
            />
          )}
        />

        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <ChipSelect
              label="Category"
              options={PURCHASE_CATEGORIES.map((category) => ({
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

        <Controller
          control={control}
          name="currentResaleValueCents"
          render={({ field, fieldState }) => (
            <MoneyField
              label="Current resale value"
              hint="Optional. What you think it is worth today — it reduces the real cost of ownership."
              valueCents={field.value}
              onChangeCents={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="imageUri"
          render={({ field }) => <ImagePickerField value={field.value} onChange={field.onChange} />}
        />
      </View>

      <View style={{ height: theme.spacing.xl }} />
      <SectionHeader
        title="What you expected"
        subtitle="Optional. If you had a rough idea when you got it, the app can hold it up against what actually happened."
      />

      <View style={{ gap: theme.spacing.md }}>
        <Controller
          control={control}
          name="expectedUsageFrequency"
          render={({ field, fieldState }) => (
            <ChipSelect
              label="How often did you expect to use it?"
              options={USAGE_PRESETS.map((preset) => ({
                value: preset.id,
                label: preset.label,
              }))}
              value={field.value}
              onChange={(next) => {
                field.onChange(next);
                if (next !== 'custom') setValue('customUsesPerMonth', null);
              }}
              hint={USAGE_PRESETS.find((preset) => preset.id === field.value)?.detail ?? undefined}
              error={fieldState.error?.message}
            />
          )}
        />

        {values.expectedUsageFrequency === 'custom' ? (
          <Controller
            control={control}
            name="customUsesPerMonth"
            render={({ field, fieldState }) => (
              <TextField
                label="Uses per month"
                required
                keyboardType="numeric"
                inputMode="numeric"
                value={field.value == null ? '' : String(field.value)}
                onChangeText={(text) => {
                  const parsed = Number.parseFloat(text.replace(',', '.'));
                  field.onChange(Number.isFinite(parsed) ? parsed : null);
                }}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                suffix="/ month"
              />
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="expectedOwnershipMonths"
          render={({ field, fieldState }) => (
            <ChipSelect
              label="How long did you expect to keep it?"
              options={OWNERSHIP_PRESETS.map((preset) => ({
                value: preset.months,
                label: preset.label,
              }))}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </View>

      {saveError ? (
        <AppText
          variant="caption"
          color="danger"
          accessibilityRole="alert"
          style={{ marginTop: theme.spacing.md }}
        >
          {saveError}
        </AppText>
      ) : null}
    </Screen>
  );
}

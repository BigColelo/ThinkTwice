import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { DateField } from '@/components/ui/DateField';
import { MoneyField } from '@/components/ui/MoneyField';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { DEFAULT_PURCHASE_CATEGORY_ID, PURCHASE_CATEGORIES } from '@/constants/categories';
import { OWNERSHIP_PRESETS } from '@/constants/ownership';
import { USAGE_PRESETS } from '@/constants/usagePresets';
import { useRepositories } from '@/db/DatabaseProvider';
import { ImagePickerField } from '@/features/images/ImagePickerField';
import { useGoBack } from '@/features/navigation/useGoBack';
import {
  ownedPurchaseSchema,
  type OwnedPurchaseFormValues,
} from '@/features/purchases/schemas/purchaseSchema';
import { createOwnedPurchase } from '@/features/purchases/services/purchaseActions';
import { useTheme } from '@/theme';
import { todayIsoDate } from '@/utils/dates';

/**
 * "Something I already own."
 *
 * Short by design: what it is, what it cost, when it arrived. Uses, expenses and
 * resale value are added later from its detail screen, where they belong.
 *
 * The expectation at the end is optional, and asked for here rather than later on
 * purpose: it is what the user thought at the time, and a forecast typed in months
 * after the fact would be a fabricated memory rather than something to compare
 * against — the app already computes the actual rate of use by itself.
 */
export default function AddOwnedPurchaseScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const goBack = useGoBack('/');
  const repositories = useRepositories();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { control, handleSubmit, setValue } = useForm<OwnedPurchaseFormValues>({
    resolver: zodResolver(ownedPurchaseSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      purchasePriceCents: 0,
      purchaseDate: todayIsoDate(),
      categoryId: DEFAULT_PURCHASE_CATEGORY_ID,
      imageUri: null,
      currentResaleValueCents: null,
      expectedUsageFrequency: null,
      customUsesPerMonth: null,
      expectedOwnershipMonths: null,
    },
  });

  const values = useWatch({ control });

  const onSubmit = handleSubmit(async (formValues) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const purchase = await createOwnedPurchase(repositories, {
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

      if (router.canDismiss()) router.dismissAll();
      router.push(`/purchase/${purchase.id}`);
    } catch {
      setSaveError('This purchase could not be saved. Please try again.');
      setIsSaving(false);
    }
  });

  return (
    <>
      <ScreenHeader title="Something I already own" onBack={goBack} />

      <Screen
        scroll
        avoidKeyboard
        footer={<Button label="Add purchase" onPress={onSubmit} loading={isSaving} />}
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
            render={({ field }) => (
              <ImagePickerField value={field.value} onChange={field.onChange} />
            )}
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
                hint={
                  USAGE_PRESETS.find((preset) => preset.id === field.value)?.detail ?? undefined
                }
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
    </>
  );
}

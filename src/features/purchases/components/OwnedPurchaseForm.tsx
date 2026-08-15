import { zodResolver } from '@hookform/resolvers/zod';
import React, { useMemo, useState } from 'react';
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
  buildOwnedPurchaseSchema,
  type OwnedPurchaseFormInput,
  type OwnedPurchaseFormValues,
} from '@/features/purchases/schemas/purchaseSchema';
import { formatMonthsAsDuration, useT } from '@/i18n';
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
  const t = useT();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Rebuilt when the language changes: the messages it carries are copy.
  const schema = useMemo(() => buildOwnedPurchaseSchema(t), [t]);

  const { control, handleSubmit, setValue, formState } = useForm<
    OwnedPurchaseFormInput,
    unknown,
    OwnedPurchaseFormValues
  >({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: purchase?.name ?? '',
      // Empty rather than zero: what was paid is the user's to enter, and a
      // leading zero cannot be typed over.
      purchasePriceCents: purchase?.purchasePriceCents ?? null,
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
      setSaveError(t('purchases.form.saveError'));
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
              label={t('purchases.form.nameLabel')}
              required
              placeholder={t('purchases.form.namePlaceholder')}
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
              label={t('purchases.form.priceLabel')}
              required
              valueCents={field.value}
              onChangeCents={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="purchaseDate"
          render={({ field, fieldState }) => (
            <DateField
              label={t('purchases.form.dateLabel')}
              required
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              hint={t('purchases.form.dateHint')}
            />
          )}
        />

        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <ChipSelect
              label={t('purchases.form.categoryLabel')}
              options={PURCHASE_CATEGORIES.map((category) => ({
                value: category.id,
                label: t(category.labelKey),
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
              label={t('purchases.form.resaleLabel')}
              hint={t('purchases.form.resaleHint')}
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
        title={t('purchases.form.expectationTitle')}
        subtitle={t('purchases.form.expectationSubtitle')}
      />

      <View style={{ gap: theme.spacing.md }}>
        <Controller
          control={control}
          name="expectedUsageFrequency"
          render={({ field, fieldState }) => (
            <ChipSelect
              label={t('purchases.form.frequencyLabel')}
              options={USAGE_PRESETS.map((preset) => ({
                value: preset.id,
                label: t(preset.labelKey),
              }))}
              value={field.value}
              onChange={(next) => {
                field.onChange(next);
                if (next !== 'custom') setValue('customUsesPerMonth', null);
              }}
              hint={(() => {
                const preset = USAGE_PRESETS.find((option) => option.id === field.value);
                return preset ? t(preset.detailKey) : undefined;
              })()}
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
                label={t('purchases.form.usesPerMonthLabel')}
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
                suffix={t('units.perMonth')}
              />
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="expectedOwnershipMonths"
          render={({ field, fieldState }) => (
            <ChipSelect
              label={t('purchases.form.ownershipLabel')}
              options={OWNERSHIP_PRESETS.map((months) => ({
                value: months,
                label: formatMonthsAsDuration(t, months),
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

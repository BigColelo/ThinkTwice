import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { MoneyField } from '@/components/ui/MoneyField';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { DEFAULT_PURCHASE_CATEGORY_ID, PURCHASE_CATEGORIES } from '@/constants/categories';
import { DEFAULT_OWNERSHIP_MONTHS, OWNERSHIP_PRESETS } from '@/constants/ownership';
import { DEFAULT_USAGE_FREQUENCY, USAGE_PRESETS } from '@/constants/usagePresets';
import {
  COOLDOWN_DAY_OPTIONS,
  DEFAULT_COOLDOWN_DAYS,
  calculatePurchaseImpact,
  suggestCooldownDays,
  type MonthlyFinances,
} from '@/domain';
import { ImagePickerField } from '@/features/images/ImagePickerField';
import { useSettings } from '@/features/settings/SettingsProvider';
import { EstimatePreview } from '@/features/wishlist/components/EstimatePreview';
import { PurchaseImpactCard } from '@/features/wishlist/components/PurchaseImpactCard';
import {
  buildWishlistItemSchema,
  type WishlistItemFormInput,
  type WishlistItemFormValues,
} from '@/features/wishlist/schemas/wishlistItemSchema';
import type { CreateWishlistItemInput } from '@/features/wishlist/services/wishlistActions';
import { formatMonthsAsDuration, useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { WishlistItem } from '@/types/domain';

/**
 * The form behind both "something I want to buy" and editing an item.
 *
 * It asks for the estimate before it asks for a decision, and shows the
 * resulting cost per use and financial impact while the user is still typing —
 * which is the entire point of the app.
 *
 * It lives here rather than in the route so both screens share one definition of
 * the fields and one set of tests; the caller supplies the header, decides what
 * saving means and where to go afterwards.
 */

export function WishlistItemForm({
  finances,
  item,
  submitLabel,
  onSubmit,
}: {
  /** Passed in rather than read here, so the form itself touches no storage. */
  finances: MonthlyFinances;
  /** The item being edited. Absent for a new one. */
  item?: WishlistItem;
  submitLabel: string;
  /** Rejecting shows the form's own error; resolving is the caller's to act on. */
  onSubmit: (values: CreateWishlistItemInput) => Promise<void>;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const { settings } = useSettings();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // An existing period counts as the user's own unless it is exactly what the
  // app suggested for the stored price — the same question the update service
  // asks, so what the chips show is always what gets saved.
  const [hasEditedCooldown, setHasEditedCooldown] = useState(
    () => item != null && item.cooldownDays !== suggestCooldownDays(item.priceCents, finances).days,
  );

  // Rebuilt when the language changes, not on every render: the messages it
  // carries are copy, and copy follows the chosen language.
  const schema = useMemo(() => buildWishlistItemSchema(t), [t]);

  const { control, handleSubmit, setValue, formState } = useForm<
    WishlistItemFormInput,
    unknown,
    WishlistItemFormValues
  >({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: item?.name ?? '',
      // Empty rather than zero: a price the user has not typed yet is not a
      // price of nothing, and a leading zero cannot be typed over.
      priceCents: item?.priceCents ?? null,
      categoryId: item?.categoryId ?? DEFAULT_PURCHASE_CATEGORY_ID,
      imageUri: item?.imageUri ?? null,
      expectedUsageFrequency: item?.expectedUsageFrequency ?? DEFAULT_USAGE_FREQUENCY,
      customUsesPerMonth: item?.customUsesPerMonth ?? null,
      expectedOwnershipMonths: item?.expectedOwnershipMonths ?? DEFAULT_OWNERSHIP_MONTHS,
      cooldownDays: item?.cooldownDays ?? DEFAULT_COOLDOWN_DAYS,
      notes: item?.notes ?? null,
    },
  });

  const values = useWatch({ control });

  const priceCents = values.priceCents ?? 0;
  const impact = useMemo(
    () => calculatePurchaseImpact(priceCents, finances),
    [priceCents, finances],
  );
  const suggestion = useMemo(
    () => suggestCooldownDays(priceCents, finances),
    [priceCents, finances],
  );

  // The suggested period follows the price until the user picks one themselves.
  const cooldownDays = hasEditedCooldown
    ? (values.cooldownDays ?? DEFAULT_COOLDOWN_DAYS)
    : suggestion.days;

  // The suggestion is kept in the form's own state, so the period that gets
  // saved is the one the schema validated — not a number computed beside it.
  useEffect(() => {
    if (!hasEditedCooldown) setValue('cooldownDays', suggestion.days);
  }, [hasEditedCooldown, suggestion.days, setValue]);

  const submit = handleSubmit(async (formValues) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSubmit({
        name: formValues.name,
        priceCents: formValues.priceCents,
        categoryId: formValues.categoryId,
        imageUri: formValues.imageUri,
        expectedUsageFrequency: formValues.expectedUsageFrequency,
        customUsesPerMonth: formValues.customUsesPerMonth,
        expectedOwnershipMonths: formValues.expectedOwnershipMonths,
        cooldownDays: formValues.cooldownDays,
        notes: formValues.notes,
      });
    } catch {
      setSaveError(t('wishlist.saveError'));
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
              label={t('wishlist.nameLabel')}
              required
              placeholder={t('wishlist.namePlaceholder')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
          )}
        />

        <Controller
          control={control}
          name="priceCents"
          render={({ field, fieldState }) => (
            <MoneyField
              label={t('wishlist.priceLabel')}
              required
              valueCents={field.value}
              onChangeCents={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <ChipSelect
              label={t('wishlist.categoryLabel')}
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
          name="imageUri"
          render={({ field }) => <ImagePickerField value={field.value} onChange={field.onChange} />}
        />
      </View>

      <View style={{ height: theme.spacing.xl }} />
      <SectionHeader
        title={t('wishlist.expectedUsageTitle')}
        subtitle={t('wishlist.expectedUsageSubtitle')}
      />

      <View style={{ gap: theme.spacing.md }}>
        <Controller
          control={control}
          name="expectedUsageFrequency"
          render={({ field, fieldState }) => (
            <ChipSelect
              label={t('wishlist.frequencyLabel')}
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
                label={t('wishlist.usesPerMonthLabel')}
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
              label={t('wishlist.ownershipLabel')}
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

        <EstimatePreview
          priceCents={values.priceCents ?? null}
          frequency={values.expectedUsageFrequency ?? null}
          customUsesPerMonth={values.customUsesPerMonth ?? null}
          expectedOwnershipMonths={values.expectedOwnershipMonths ?? null}
        />
      </View>

      <View style={{ height: theme.spacing.xl }} />
      <SectionHeader title={t('impact.sectionTitle')} />
      <PurchaseImpactCard impact={impact} />

      <View style={{ height: theme.spacing.xl }} />
      <SectionHeader
        title={t('cooldown.sectionTitle')}
        subtitle={
          settings.cooldownRemindersEnabled ? t('cooldown.remindersOn') : t('cooldown.remindersOff')
        }
      />

      <Controller
        control={control}
        name="cooldownDays"
        render={({ fieldState }) => (
          <ChipSelect
            label={t('cooldown.giveYourself')}
            options={COOLDOWN_DAY_OPTIONS.map((days) => ({
              value: days,
              label: t('units.day', { count: days }),
            }))}
            value={cooldownDays}
            onChange={(days) => {
              setHasEditedCooldown(true);
              setValue('cooldownDays', days, { shouldValidate: true });
            }}
            hint={
              item != null
                ? t('cooldown.editHint')
                : hasEditedCooldown
                  ? undefined
                  : t('cooldown.suggestionHint', {
                      period: t('units.day', { count: suggestion.days }),
                      rationale: t(`cooldown.rationale.${suggestion.rationale}`),
                    })
            }
            error={fieldState.error?.message}
          />
        )}
      />

      <View style={{ height: theme.spacing.xl }} />
      <SectionHeader title={t('wishlist.reasonTitle')} subtitle={t('common.optional')} />

      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <TextField
            label={t('wishlist.notesLabel')}
            multiline
            placeholder={t('wishlist.notesPlaceholder')}
            value={field.value ?? ''}
            onChangeText={(text) => field.onChange(text === '' ? null : text)}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

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

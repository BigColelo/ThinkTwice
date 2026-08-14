import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { FormField } from '@/components/ui/FormField';
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
  REASON_TAGS,
  wishlistItemSchema,
  type WishlistItemFormValues,
} from '@/features/wishlist/schemas/wishlistItemSchema';
import type { CreateWishlistItemInput } from '@/features/wishlist/services/wishlistActions';
import { useTheme } from '@/theme';
import type { WishlistItem } from '@/types/domain';
import { pluralize } from '@/utils/dates';

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
  const { settings } = useSettings();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // An existing period counts as the user's own unless it is exactly what the
  // app suggested for the stored price — the same question the update service
  // asks, so what the chips show is always what gets saved.
  const [hasEditedCooldown, setHasEditedCooldown] = useState(
    () => item != null && item.cooldownDays !== suggestCooldownDays(item.priceCents, finances).days,
  );

  const { control, handleSubmit, setValue, formState } = useForm<WishlistItemFormValues>({
    resolver: zodResolver(wishlistItemSchema),
    mode: 'onTouched',
    defaultValues: {
      name: item?.name ?? '',
      priceCents: item?.priceCents ?? 0,
      categoryId: item?.categoryId ?? DEFAULT_PURCHASE_CATEGORY_ID,
      imageUri: item?.imageUri ?? null,
      expectedUsageFrequency: item?.expectedUsageFrequency ?? DEFAULT_USAGE_FREQUENCY,
      customUsesPerMonth: item?.customUsesPerMonth ?? null,
      expectedOwnershipMonths: item?.expectedOwnershipMonths ?? DEFAULT_OWNERSHIP_MONTHS,
      cooldownDays: item?.cooldownDays ?? DEFAULT_COOLDOWN_DAYS,
      reasonTags: item?.reasonTags ?? [],
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
        reasonTags: formValues.reasonTags,
        notes: formValues.notes,
      });
    } catch {
      setSaveError('This item could not be saved. Please try again.');
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
              placeholder="What are you considering?"
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
              label="Price"
              required
              // Zero is what an empty field parses to, and it is not a valid
              // price — so it shows as empty rather than as a figure the user
              // never typed.
              valueCents={field.value === 0 ? null : field.value}
              onChangeCents={(cents) => field.onChange(cents ?? 0)}
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
          name="imageUri"
          render={({ field }) => <ImagePickerField value={field.value} onChange={field.onChange} />}
        />
      </View>

      <View style={{ height: theme.spacing.xl }} />
      <SectionHeader
        title="Expected usage"
        subtitle="Your best guess is enough — it is what turns a price into a cost per use."
      />

      <View style={{ gap: theme.spacing.md }}>
        <Controller
          control={control}
          name="expectedUsageFrequency"
          render={({ field, fieldState }) => (
            <ChipSelect
              label="How often will you use it?"
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
              label="How long will you keep it?"
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

        <EstimatePreview
          priceCents={values.priceCents ?? null}
          frequency={values.expectedUsageFrequency ?? null}
          customUsesPerMonth={values.customUsesPerMonth ?? null}
          expectedOwnershipMonths={values.expectedOwnershipMonths ?? null}
        />
      </View>

      <View style={{ height: theme.spacing.xl }} />
      <SectionHeader title="Purchase impact" />
      <PurchaseImpactCard impact={impact} />

      <View style={{ height: theme.spacing.xl }} />
      <SectionHeader
        title="Reflection period"
        subtitle={
          settings.cooldownRemindersEnabled
            ? 'ThinkTwice will remind you about this item when the period is over.'
            : 'ThinkTwice will hold on to this item until the period is over. Turn on reminders in Settings to be notified.'
        }
      />

      <Controller
        control={control}
        name="cooldownDays"
        render={({ fieldState }) => (
          <ChipSelect
            label="Give yourself"
            options={COOLDOWN_DAY_OPTIONS.map((days) => ({
              value: days,
              label: pluralize(days, 'day'),
            }))}
            value={cooldownDays}
            onChange={(days) => {
              setHasEditedCooldown(true);
              setValue('cooldownDays', days, { shouldValidate: true });
            }}
            hint={
              item != null
                ? 'Counted from when this reflection period started, not from today.'
                : hasEditedCooldown
                  ? undefined
                  : `Suggested: ${pluralize(suggestion.days, 'day')}. ${suggestion.rationale} You can change it.`
            }
            error={fieldState.error?.message}
          />
        )}
      />

      <View style={{ height: theme.spacing.xl }} />
      <SectionHeader title="Why do you want it?" subtitle="Optional" />

      <View style={{ gap: theme.spacing.md }}>
        <Controller
          control={control}
          name="reasonTags"
          render={({ field }) => (
            <FormField label="Reasons">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                {REASON_TAGS.map((tag) => {
                  const isSelected = field.value.includes(tag);
                  return (
                    <Chip
                      key={tag}
                      label={tag}
                      selected={isSelected}
                      onPress={() =>
                        field.onChange(
                          isSelected
                            ? field.value.filter((value: string) => value !== tag)
                            : [...field.value, tag],
                        )
                      }
                    />
                  );
                })}
              </View>
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field, fieldState }) => (
            <TextField
              label="Notes"
              multiline
              placeholder="Anything you want to remember when you decide."
              value={field.value ?? ''}
              onChangeText={(text) => field.onChange(text === '' ? null : text)}
              onBlur={field.onBlur}
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

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { FormField } from '@/components/ui/FormField';
import { MoneyField } from '@/components/ui/MoneyField';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { DEFAULT_PURCHASE_CATEGORY_ID, PURCHASE_CATEGORIES } from '@/constants/categories';
import { DEFAULT_OWNERSHIP_MONTHS, OWNERSHIP_PRESETS } from '@/constants/ownership';
import { DEFAULT_USAGE_FREQUENCY, USAGE_PRESETS } from '@/constants/usagePresets';
import { useRepositories } from '@/db/DatabaseProvider';
import { COOLDOWN_DAY_OPTIONS, calculatePurchaseImpact, suggestCooldownDays } from '@/domain';
import { ImagePickerField } from '@/features/images/ImagePickerField';
import { useMonthlyFinances } from '@/features/money/hooks/useMonthlyFinances';
import { useSettings } from '@/features/settings/SettingsProvider';
import { EstimatePreview } from '@/features/wishlist/components/EstimatePreview';
import { PurchaseImpactCard } from '@/features/wishlist/components/PurchaseImpactCard';
import {
  REASON_TAGS,
  wishlistItemSchema,
  type WishlistItemFormValues,
} from '@/features/wishlist/schemas/wishlistItemSchema';
import { createWishlistItem } from '@/features/wishlist/services/wishlistActions';
import { useTheme } from '@/theme';
import { pluralize } from '@/utils/dates';

/**
 * "Something I want to buy."
 *
 * The form asks for the estimate before it asks for a decision, and shows the
 * resulting cost per use and financial impact while the user is still typing —
 * which is the entire point of the app.
 */
export default function AddWishlistItemScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const repositories = useRepositories();
  const { settings } = useSettings();
  const { finances } = useMonthlyFinances();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasEditedCooldown, setHasEditedCooldown] = useState(false);

  const { control, handleSubmit, setValue, formState } = useForm<WishlistItemFormValues>({
    resolver: zodResolver(wishlistItemSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      priceCents: 0,
      categoryId: DEFAULT_PURCHASE_CATEGORY_ID,
      imageUri: null,
      expectedUsageFrequency: DEFAULT_USAGE_FREQUENCY,
      customUsesPerMonth: null,
      expectedOwnershipMonths: DEFAULT_OWNERSHIP_MONTHS,
      cooldownDays: 7,
      reasonTags: [],
      notes: null,
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
  const cooldownDays = hasEditedCooldown ? (values.cooldownDays ?? 7) : suggestion.days;

  const onSubmit = handleSubmit(async (formValues) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const item = await createWishlistItem(
        repositories,
        {
          name: formValues.name,
          priceCents: formValues.priceCents,
          categoryId: formValues.categoryId,
          imageUri: formValues.imageUri,
          expectedUsageFrequency: formValues.expectedUsageFrequency,
          customUsesPerMonth: formValues.customUsesPerMonth,
          expectedOwnershipMonths: formValues.expectedOwnershipMonths,
          cooldownDays,
          reasonTags: formValues.reasonTags,
          notes: formValues.notes,
        },
        { scheduleReminder: settings.cooldownRemindersEnabled },
      );

      // Leave the add flow entirely, then open the item — so "back" from the
      // detail screen returns to Home rather than to a form that no longer applies.
      if (router.canDismiss()) router.dismissAll();
      router.push(`/wishlist/${item.id}`);
    } catch {
      setSaveError('This item could not be saved. Please try again.');
      setIsSaving(false);
    }
  });

  return (
    <>
      <ScreenHeader title="Something I want to buy" onBack={() => router.back()} />

      <Screen
        scroll
        avoidKeyboard
        footer={
          <Button
            label="Start thinking"
            onPress={onSubmit}
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
                valueCents={field.value}
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
            render={({ field }) => (
              <ImagePickerField value={field.value} onChange={field.onChange} />
            )}
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
                hasEditedCooldown
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
    </>
  );
}

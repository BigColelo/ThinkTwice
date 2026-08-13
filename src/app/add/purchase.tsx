import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { DateField } from '@/components/ui/DateField';
import { MoneyField } from '@/components/ui/MoneyField';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { DEFAULT_PURCHASE_CATEGORY_ID, PURCHASE_CATEGORIES } from '@/constants/categories';
import { useRepositories } from '@/db/DatabaseProvider';
import { ImagePickerField } from '@/features/images/ImagePickerField';
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
 * Deliberately short: name, price, date. Everything else about the item —
 * uses, expenses, resale value — is added later from its detail screen, where
 * it belongs.
 */
export default function AddOwnedPurchaseScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const repositories = useRepositories();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<OwnedPurchaseFormValues>({
    resolver: zodResolver(ownedPurchaseSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      purchasePriceCents: 0,
      purchaseDate: todayIsoDate(),
      categoryId: DEFAULT_PURCHASE_CATEGORY_ID,
      imageUri: null,
      currentResaleValueCents: null,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const purchase = await createOwnedPurchase(repositories, {
        name: values.name,
        purchasePriceCents: values.purchasePriceCents,
        purchaseDate: values.purchaseDate,
        categoryId: values.categoryId,
        imageUri: values.imageUri,
        currentResaleValueCents: values.currentResaleValueCents,
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
      <ScreenHeader title="Something I already own" onBack={() => router.back()} />

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

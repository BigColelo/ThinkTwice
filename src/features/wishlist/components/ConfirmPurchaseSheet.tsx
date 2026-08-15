import { zodResolver } from '@hookform/resolvers/zod';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { MoneyField } from '@/components/ui/MoneyField';
import {
  buildConfirmedPurchaseSchema,
  type ConfirmedPurchaseFormInput,
  type ConfirmedPurchaseFormValues,
} from '@/features/purchases/schemas/purchaseSchema';
import type { ConvertToPurchaseOptions } from '@/features/wishlist/services/wishlistActions';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { WishlistItem } from '@/types/domain';
import { todayIsoDate } from '@/utils/dates';

/**
 * Confirming "I bought it".
 *
 * The wishlist item knows what the user *expected* to pay and when they were
 * thinking about it; only they know what was actually paid and when. Defaulting
 * both silently would put an invented price at the root of every cost-per-use
 * figure the app shows afterwards, so they are asked for — prefilled, so
 * confirming takes one tap when nothing changed.
 *
 * The copy states what happens and nothing else: buying is not congratulated
 * here any more than it is discouraged elsewhere.
 */

export function ConfirmPurchaseSheet({
  item,
  visible,
  onClose,
  onConfirm,
}: {
  item: Pick<WishlistItem, 'name' | 'priceCents'>;
  visible: boolean;
  onClose: () => void;
  /** Rejecting shows the sheet's own error; resolving is the caller's to act on. */
  onConfirm: (options: Required<ConvertToPurchaseOptions>) => Promise<void>;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Rebuilt when the language changes: the messages it carries are copy.
  const schema = useMemo(() => buildConfirmedPurchaseSchema(t), [t]);

  const { control, handleSubmit, reset } = useForm<
    ConfirmedPurchaseFormInput,
    unknown,
    ConfirmedPurchaseFormValues
  >({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      purchaseDate: todayIsoDate(),
      purchasePriceCents: item.priceCents,
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
      await onConfirm({
        purchaseDate: values.purchaseDate,
        actualPriceCents: values.purchasePriceCents,
      });
    } catch {
      setSaveError(t('wishlist.confirmPurchase.saveError'));
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
          accessibilityLabel={t('common.close')}
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
              {t('wishlist.confirmPurchase.title')}
            </AppText>
            <AppText variant="caption" color="secondary">
              {t('wishlist.confirmPurchase.description', { name: item.name })}
            </AppText>

            <Controller
              control={control}
              name="purchasePriceCents"
              render={({ field, fieldState }) => (
                <MoneyField
                  label={t('wishlist.confirmPurchase.priceLabel')}
                  required
                  hint={t('wishlist.confirmPurchase.priceHint')}
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
                  label={t('wishlist.confirmPurchase.dateLabel')}
                  required
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  hint={t('wishlist.confirmPurchase.dateHint')}
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
                label={t('common.cancel')}
                variant="secondary"
                onPress={close}
                style={{ flex: 1 }}
                disabled={isSaving}
              />
              <Button
                label={t('wishlist.iBoughtIt')}
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

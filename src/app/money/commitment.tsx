import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Switch, View } from 'react-native';

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
  buildCommitmentSchema,
  type CommitmentFormInput,
  type CommitmentFormValues,
} from '@/features/money/schemas/commitmentSchema';
import { useGoBack } from '@/features/navigation/useGoBack';
import { useT } from '@/i18n';
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
  const t = useT();
  const repositories = useRepositories();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goBack = useGoBack('/money');

  const isEditing = Boolean(id);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Rebuilt when the language changes: the messages it carries are copy.
  const schema = useMemo(() => buildCommitmentSchema(t), [t]);

  const { control, handleSubmit, reset } = useForm<
    CommitmentFormInput,
    unknown,
    CommitmentFormValues
  >({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      // Empty rather than zero: the amount is the user's to enter, and a leading
      // zero cannot be typed over.
      amountCents: null,
      frequency: DEFAULT_COMMITMENT_FREQUENCY,
      categoryId: DEFAULT_COMMITMENT_CATEGORY_ID,
      isActive: true,
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
          isActive: commitment.isActive,
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
      goBack();
    } catch {
      setSaveError(t('money.commitment.saveError'));
      setIsSaving(false);
    }
  });

  const handleDelete = async (): Promise<void> => {
    if (!id) return;
    const confirmed = await confirm({
      title: t('money.commitment.deleteTitle'),
      message: t('money.commitment.deleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!confirmed) return;

    await repositories.commitments.remove(id);
    invalidate('commitments');
    goBack();
  };

  const amountCents = values.amountCents ?? 0;
  const frequency = values.frequency ?? DEFAULT_COMMITMENT_FREQUENCY;
  const monthlyEquivalent = calculateMonthlyCommitmentEquivalent({ amountCents, frequency });
  const annualEquivalent = calculateAnnualCommitmentEquivalent({ amountCents, frequency });

  return (
    <>
      <ScreenHeader
        title={isEditing ? t('money.commitment.editTitle') : t('money.commitment.addTitle')}
        textAction={{ label: t('common.cancel'), onPress: goBack }}
      />

      <Screen
        scroll
        avoidKeyboard
        footer={
          <Button
            label={isEditing ? t('money.commitment.saveChanges') : t('money.commitment.addTitle')}
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
                label={t('money.commitment.nameLabel')}
                required
                placeholder={t('money.commitment.namePlaceholder')}
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
                label={t('money.commitment.amountLabel')}
                required
                hint={t('money.commitment.amountHint')}
                valueCents={field.value}
                onChangeCents={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="frequency"
            render={({ field, fieldState }) => (
              <ChipSelect
                label={t('money.commitment.frequencyLabel')}
                options={COMMITMENT_FREQUENCIES.map((option) => ({
                  value: option.id,
                  label: t(option.labelKey),
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
                label={t('money.commitment.categoryLabel')}
                options={COMMITMENT_CATEGORIES.map((category) => ({
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

          {isEditing ? (
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Card variant="muted" padding={theme.spacing.md}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">{t('money.commitment.activeLabel')}</AppText>
                      <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                        {t('money.commitment.activeHint')}
                      </AppText>
                    </View>
                    <Switch
                      accessibilityLabel={t('money.commitment.activeLabel')}
                      value={field.value}
                      onValueChange={field.onChange}
                      trackColor={{
                        true: theme.colors.accent.base,
                        false: theme.colors.borderStrong,
                      }}
                    />
                  </View>
                </Card>
              )}
            />
          ) : null}

          {frequency !== 'monthly' && amountCents > 0 ? (
            <Card variant="muted" padding={theme.spacing.md}>
              <AppText variant="label" color="secondary">
                {t('money.commitment.monthlyEquivalent')}
              </AppText>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: theme.spacing.xs,
                  marginTop: theme.spacing.xxs,
                }}
              >
                <MoneyValue
                  cents={monthlyEquivalent}
                  variant="metricSmall"
                  suffix={` ${t('units.perMonth')}`}
                />
              </View>
              <MoneyValue
                cents={annualEquivalent}
                variant="caption"
                color="secondary"
                suffix={` ${t('units.perYear')}`}
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
              label={t('money.commitment.delete')}
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

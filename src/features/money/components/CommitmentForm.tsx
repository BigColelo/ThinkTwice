import { zodResolver } from '@hookform/resolvers/zod';
import React, { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { InlineError } from '@/components/ui/InlineError';
import { MoneyField } from '@/components/ui/MoneyField';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { COMMITMENT_CATEGORIES, DEFAULT_COMMITMENT_CATEGORY_ID } from '@/constants/categories';
import { COMMITMENT_FREQUENCIES, DEFAULT_COMMITMENT_FREQUENCY } from '@/constants/frequencies';
import {
  calculateAnnualCommitmentEquivalent,
  calculateMonthlyCommitmentEquivalent,
} from '@/domain';
import { useConfirm } from '@/features/dialogs/useConfirm';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import {
  buildCommitmentSchema,
  type CommitmentFormInput,
  type CommitmentFormValues,
} from '@/features/money/schemas/commitmentSchema';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { RecurringCommitment } from '@/types/domain';

/**
 * The form behind both "add a commitment" and editing one.
 *
 * It lives here rather than in the route so both cases share one definition of
 * the fields and one set of tests; the caller supplies the header, decides what
 * saving means and where to go afterwards — the same arrangement as the wishlist
 * and owned-purchase forms.
 *
 * The monthly equivalent appears as soon as a non-monthly frequency is chosen
 * with an amount entered, because that is the figure the rest of the app will
 * use: a €300 quarterly bill is €100 of the month the impact of every purchase
 * is measured against, and the form says so before it is saved rather than
 * leaving the user to find it on the list afterwards.
 */

export function CommitmentForm({
  commitment,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  /** The commitment being edited. Absent when adding one. */
  commitment?: RecurringCommitment;
  submitLabel: string;
  /** Rejecting shows the form's own error; resolving is the caller's to act on. */
  onSubmit: (values: CommitmentFormValues) => Promise<void>;
  /** Offered only when editing. The confirmation is asked for here. */
  onDelete?: () => Promise<void>;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const confirm = useConfirm();

  const save = useAsyncAction();
  const remove = useAsyncAction();
  const isBusy = save.isRunning || remove.isRunning;

  // Rebuilt when the language changes: the messages it carries are copy.
  const schema = useMemo(() => buildCommitmentSchema(t), [t]);

  const { control, handleSubmit } = useForm<CommitmentFormInput, unknown, CommitmentFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: commitment?.name ?? '',
      // Empty rather than zero: the amount is the user's to enter, and a leading
      // zero cannot be typed over.
      amountCents: commitment?.amountCents ?? null,
      frequency: commitment?.frequency ?? DEFAULT_COMMITMENT_FREQUENCY,
      categoryId: commitment?.categoryId ?? DEFAULT_COMMITMENT_CATEGORY_ID,
      isActive: commitment?.isActive ?? true,
    },
  });

  const values = useWatch({ control });
  const isEditing = commitment != null;

  const amountCents = values.amountCents ?? 0;
  const frequency = values.frequency ?? DEFAULT_COMMITMENT_FREQUENCY;
  const showsEquivalent = frequency !== 'monthly' && amountCents > 0;

  const submit = handleSubmit(async (formValues) => {
    await save.run(() => onSubmit(formValues), {
      errorMessage: t('money.commitment.saveError'),
      // Saving closes the form onto the Money screen.
      stayBusyOnSuccess: true,
    });
  });

  const handleDelete = async (): Promise<void> => {
    if (!onDelete) return;

    const confirmed = await confirm({
      title: t('money.commitment.deleteTitle'),
      message: t('money.commitment.deleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!confirmed) return;

    await remove.run(onDelete, {
      errorMessage: t('money.commitment.deleteError'),
      stayBusyOnSuccess: true,
    });
  };

  return (
    <Screen
      scroll
      avoidKeyboard
      footer={
        <Button label={submitLabel} onPress={submit} loading={save.isRunning} disabled={isBusy} />
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{t('money.commitment.activeLabel')}</AppText>
                    <AppText
                      variant="caption"
                      color="secondary"
                      style={{ marginTop: theme.spacing.xxxs }}
                    >
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

        {showsEquivalent ? (
          <Card variant="muted" padding={theme.spacing.md}>
            <AppText variant="label" color="secondary">
              {t('money.commitment.monthlyEquivalent')}
            </AppText>
            <MoneyValue
              cents={calculateMonthlyCommitmentEquivalent({ amountCents, frequency })}
              variant="metricSmall"
              suffix={` ${t('units.perMonth')}`}
              style={{ marginTop: theme.spacing.xxs }}
            />
            <MoneyValue
              cents={calculateAnnualCommitmentEquivalent({ amountCents, frequency })}
              variant="caption"
              color="secondary"
              suffix={` ${t('units.perYear')}`}
              style={{ marginTop: theme.spacing.xxxs }}
            />
          </Card>
        ) : null}

        <InlineError message={save.error ?? remove.error} />

        {onDelete ? (
          <Button
            label={t('money.commitment.delete')}
            variant="destructive"
            size="md"
            onPress={handleDelete}
            loading={remove.isRunning}
            disabled={isBusy}
            style={{ marginTop: theme.spacing.sm }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineError } from '@/components/ui/InlineError';
import { MoneyField } from '@/components/ui/MoneyField';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import { buildMonthlyIncomeSchema } from '@/features/money/schemas/commitmentSchema';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Cents } from '@/types/domain';

/**
 * Inline editing for income and the savings target.
 *
 * Both are single numbers, so a dedicated form screen would add a navigation
 * step for no benefit. Changes are saved explicitly rather than on every
 * keystroke, so a half-typed figure never becomes the stored one — and income
 * is the figure every impact percentage in the app divides by.
 */

/**
 * Zero income is how "not set yet" is stored — onboarding can be skipped, and
 * nothing derived from it can be computed until there is a figure. The field
 * shows that as empty rather than as a zero the user never typed, and clearing
 * the field means the same thing again.
 */
function editableIncome(cents: Cents): Cents | null {
  return cents === 0 ? null : cents;
}

export function IncomeEditor(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const { settings, updateSettings } = useSettings();
  const save = useAsyncAction();

  const [incomeCents, setIncomeCents] = useState<Cents | null>(
    editableIncome(settings.monthlyNetIncomeCents),
  );
  const [savingsCents, setSavingsCents] = useState<Cents | null>(
    settings.monthlySavingsTargetCents,
  );
  const [adopted, setAdopted] = useState({
    income: settings.monthlyNetIncomeCents,
    savings: settings.monthlySavingsTargetCents,
  });
  const [fieldErrors, setFieldErrors] = useState<{ income?: string; savings?: string }>({});

  // The Money screen stays mounted while the tabs are alive, so settings changed
  // elsewhere (onboarding, a data reset, the dev seed) have to be adopted here
  // or the fields would keep showing figures the app no longer holds. Adjusting
  // during render, rather than in an effect, avoids a frame of stale values.
  if (
    adopted.income !== settings.monthlyNetIncomeCents ||
    adopted.savings !== settings.monthlySavingsTargetCents
  ) {
    setAdopted({
      income: settings.monthlyNetIncomeCents,
      savings: settings.monthlySavingsTargetCents,
    });
    setIncomeCents(editableIncome(settings.monthlyNetIncomeCents));
    setSavingsCents(settings.monthlySavingsTargetCents);
  }

  const hasChanges =
    (incomeCents ?? 0) !== settings.monthlyNetIncomeCents ||
    savingsCents !== settings.monthlySavingsTargetCents;

  const handleSave = async (): Promise<void> => {
    // The parser guarantees integer cents or nothing, but not that the figure
    // makes sense: a pasted minus sign or an extra zero would otherwise be
    // stored and quietly distort every derived number.
    const parsed = buildMonthlyIncomeSchema(t).safeParse({
      monthlyNetIncomeCents: incomeCents ?? 0,
      monthlySavingsTargetCents: savingsCents,
    });

    if (!parsed.success) {
      const errors: { income?: string; savings?: string } = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'monthlyNetIncomeCents') errors.income ??= issue.message;
        if (issue.path[0] === 'monthlySavingsTargetCents') errors.savings ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    await save.run(() => updateSettings(parsed.data), { errorMessage: t('money.saveError') });
  };

  return (
    <Card padding={theme.spacing.md}>
      <AppText variant="heading">{t('money.setupTitle')}</AppText>

      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.md }}>
        <MoneyField
          label={t('money.incomeLabel')}
          hint={t('money.incomeHint')}
          valueCents={incomeCents}
          onChangeCents={setIncomeCents}
          error={fieldErrors.income}
        />
        <MoneyField
          label={t('money.savingsLabel')}
          hint={t('money.savingsHint')}
          valueCents={savingsCents}
          onChangeCents={setSavingsCents}
          error={fieldErrors.savings}
        />

        <InlineError message={save.error} />

        {hasChanges ? (
          <Button
            label={t('money.saveChanges')}
            onPress={handleSave}
            loading={save.isRunning}
            size="md"
          />
        ) : null}
      </View>
    </Card>
  );
}

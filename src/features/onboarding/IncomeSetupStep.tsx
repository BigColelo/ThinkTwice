import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { MoneyField } from '@/components/ui/MoneyField';
import { Screen } from '@/components/ui/Screen';
import type { SettingsUpdate } from '@/db/repositories';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import { buildMonthlyIncomeSchema } from '@/features/money/schemas/commitmentSchema';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Cents } from '@/types/domain';

/**
 * The optional setup step. Income is what unlocks the impact figures, so it is
 * asked for once here — and can be skipped without consequence.
 *
 * The figure is checked by the same schema as the Money screen's editor. The
 * field parses a pasted minus sign and any number of digits, so without it a
 * negative or absurd income could be stored on the first screen of the app and
 * quietly distort every percentage after it.
 */
export function IncomeSetupStep({ onBack }: { onBack: () => void }): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useAppRouter();
  const { updateSettings } = useSettings();

  const [incomeCents, setIncomeCents] = useState<Cents | null>(null);
  const [incomeError, setIncomeError] = useState<string | undefined>(undefined);
  const save = useAsyncAction();

  // Rebuilt when the language changes: the messages it carries are copy.
  const schema = useMemo(() => buildMonthlyIncomeSchema(t), [t]);

  const finish = async (withIncome: boolean): Promise<void> => {
    const update: SettingsUpdate = { onboardingCompleted: true };

    if (withIncome && incomeCents != null) {
      const parsed = schema.safeParse({
        monthlyNetIncomeCents: incomeCents,
        monthlySavingsTargetCents: null,
      });
      if (!parsed.success) {
        setIncomeError(parsed.error.issues[0]?.message);
        return;
      }
      update.monthlyNetIncomeCents = parsed.data.monthlyNetIncomeCents;
    }

    const saved = await save.run(() => updateSettings(update), {
      errorMessage: t('onboarding.saveError'),
      // Finishing leaves onboarding for the app itself.
      stayBusyOnSuccess: true,
    });

    if (saved) router.replace('/');
  };

  return (
    <Screen scroll avoidKeyboard>
      <AppText variant="display" style={{ marginTop: theme.spacing.xl }}>
        {t('onboarding.incomeTitle')}
      </AppText>
      <AppText variant="body" color="secondary" style={{ marginTop: theme.spacing.sm }}>
        {t('onboarding.incomeBody')}
      </AppText>

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
        <MoneyField
          label={t('onboarding.incomeLabel')}
          hint={t('onboarding.incomeHint')}
          valueCents={incomeCents}
          onChangeCents={(cents) => {
            setIncomeCents(cents);
            setIncomeError(undefined);
          }}
          error={incomeError}
        />

        <InlineError message={save.error} />

        <Button
          label={t('onboarding.continue')}
          onPress={() => finish(true)}
          loading={save.isRunning}
          disabled={incomeCents == null}
        />
        <Button
          label={t('onboarding.skipForNow')}
          variant="ghost"
          size="md"
          onPress={() => finish(false)}
          disabled={save.isRunning}
        />
        <Button
          label={t('onboarding.back')}
          variant="ghost"
          size="sm"
          onPress={onBack}
          disabled={save.isRunning}
        />
      </View>
    </Screen>
  );
}

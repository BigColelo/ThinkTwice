import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { MoneyField } from '@/components/ui/MoneyField';
import { Screen } from '@/components/ui/Screen';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Cents } from '@/types/domain';

/**
 * The optional setup step. Income is what unlocks the impact figures, so it is
 * asked for once here — and can be skipped without consequence.
 */
export function IncomeSetupStep({ onBack }: { onBack: () => void }): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useAppRouter();
  const { updateSettings } = useSettings();

  const [incomeCents, setIncomeCents] = useState<Cents | null>(null);
  const save = useAsyncAction();

  const finish = async (withIncome: boolean): Promise<void> => {
    const saved = await save.run(
      () =>
        updateSettings({
          onboardingCompleted: true,
          ...(withIncome && incomeCents != null ? { monthlyNetIncomeCents: incomeCents } : {}),
        }),
      // Finishing leaves onboarding for the app itself.
      { errorMessage: t('onboarding.saveError'), stayBusyOnSuccess: true },
    );

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
          onChangeCents={setIncomeCents}
        />

        {save.error ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            {save.error}
          </AppText>
        ) : null}

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

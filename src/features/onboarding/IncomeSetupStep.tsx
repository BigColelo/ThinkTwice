import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { MoneyField } from '@/components/ui/MoneyField';
import { Screen } from '@/components/ui/Screen';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useTheme } from '@/theme';
import type { Cents } from '@/types/domain';

/**
 * The optional setup step. Income is what unlocks the impact figures, so it is
 * asked for once here — and can be skipped without consequence.
 */
export function IncomeSetupStep({ onBack }: { onBack: () => void }): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const { updateSettings } = useSettings();

  const [incomeCents, setIncomeCents] = useState<Cents | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const finish = async (withIncome: boolean): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateSettings({
        onboardingCompleted: true,
        ...(withIncome && incomeCents != null ? { monthlyNetIncomeCents: incomeCents } : {}),
      });
      router.replace('/');
    } catch {
      setSaveError('Your setup could not be saved. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <Screen scroll edgeTop avoidKeyboard>
      <AppText variant="display" style={{ marginTop: theme.spacing.xl }}>
        One number to start
      </AppText>
      <AppText variant="body" color="secondary" style={{ marginTop: theme.spacing.sm }}>
        Your monthly net income is what lets ThinkTwice put a price in context. You can add it later
        instead, and add your recurring commitments whenever you like.
      </AppText>

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
        <MoneyField
          label="Monthly net income"
          hint="What actually reaches your account each month."
          valueCents={incomeCents}
          onChangeCents={setIncomeCents}
        />

        {saveError ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            {saveError}
          </AppText>
        ) : null}

        <Button
          label="Continue"
          onPress={() => finish(true)}
          loading={isSaving}
          disabled={incomeCents == null}
        />
        <Button
          label="Skip for now"
          variant="ghost"
          size="md"
          onPress={() => finish(false)}
          disabled={isSaving}
        />
        <Button label="Back" variant="ghost" size="sm" onPress={onBack} disabled={isSaving} />
      </View>
    </Screen>
  );
}

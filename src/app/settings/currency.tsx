import React from 'react';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useGoBack } from '@/features/navigation/useGoBack';
import { CurrencyPicker } from '@/features/settings/components/CurrencyPicker';
import { useSettings } from '@/features/settings/SettingsProvider';
import { resolveLanguage, useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { CurrencyCode } from '@/types/domain';

/**
 * The currency picker.
 *
 * There is no "System default" here, unlike the language screen. Amounts are
 * stored as entered and never converted, so following the device would silently
 * relabel every figure already in the database the first time the user travels.
 * The choice has to be one they made on purpose, and the caption under the list
 * says why.
 *
 * The screen owns the write; the list is a feature component so it can be tested
 * without a database.
 */
export default function CurrencyScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const goBack = useGoBack('/settings');
  const { settings, updateSettings } = useSettings();

  const select = (code: CurrencyCode): void => {
    if (code === settings.currencyCode) return;
    void updateSettings({ currencyCode: code });
  };

  return (
    <>
      <ScreenHeader title={t('settings.currency.title')} onBack={goBack} />

      <Screen scroll>
        <CurrencyPicker
          value={settings.currencyCode}
          language={resolveLanguage(settings.language)}
          onSelect={select}
        />

        <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.sm }}>
          {t('settings.currency.notConverted')}
        </AppText>
      </Screen>
    </>
  );
}

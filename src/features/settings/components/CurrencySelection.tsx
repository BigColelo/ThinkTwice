import React from 'react';

import { AppText } from '@/components/ui/AppText';
import { InlineError } from '@/components/ui/InlineError';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import { useSettings } from '@/features/settings/SettingsProvider';
import { resolveLanguage, useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { CurrencyCode } from '@/types/domain';

import { CurrencyPicker } from './CurrencyPicker';

/**
 * Choosing the currency: the list, the write, and the caption that explains the
 * one thing a user must know before choosing.
 *
 * There is no "System default" here, unlike the language screen. Amounts are
 * stored as entered and never converted, so following the device would silently
 * relabel every figure already in the database the first time the user travels.
 * The choice has to be one they made on purpose, and the caption under the list
 * says why.
 */
export function CurrencySelection(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const { settings, updateSettings } = useSettings();
  const save = useAsyncAction();

  const select = (code: CurrencyCode): void => {
    if (code === settings.currencyCode) return;
    void save.run(() => updateSettings({ currencyCode: code }), {
      errorMessage: t('settings.saveError'),
    });
  };

  return (
    <>
      <CurrencyPicker
        value={settings.currencyCode}
        language={resolveLanguage(settings.language)}
        onSelect={select}
      />

      <InlineError message={save.error} spaceAbove="sm" />

      <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.sm }}>
        {t('settings.currency.notConverted')}
      </AppText>
    </>
  );
}

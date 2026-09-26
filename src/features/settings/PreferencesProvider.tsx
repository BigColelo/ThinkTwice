import React from 'react';

import { I18nProvider } from '@/i18n';
import { ThemeProvider } from '@/theme';

import { useSettings } from './SettingsProvider';

/**
 * Applies the theme and the language the user chose to everything below it.
 *
 * The root layout provides both twice. The outer pair follows the device,
 * because the database gate and the crash screen render before any preference
 * can be read; this pair follows what is stored, and every screen sits under it.
 */
export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { settings } = useSettings();

  return (
    <ThemeProvider mode={settings.themeMode}>
      <I18nProvider language={settings.language}>{children}</I18nProvider>
    </ThemeProvider>
  );
}

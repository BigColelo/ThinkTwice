import { render, type RenderResult } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import {
  FALLBACK_SETTINGS,
  SettingsContext,
  type SettingsContextValue,
} from '@/features/settings/SettingsProvider';
import { I18nProvider } from '@/i18n';
import { ThemeProvider } from '@/theme';
import type { AppSettings, LanguageCode, ThemeMode } from '@/types/domain';

/**
 * Renders a component inside the providers it needs — theme, settings and
 * language — but without a database. Components below this level read money
 * formatting, theme and copy from context, so supplying those three is enough
 * to exercise them.
 */

const SAFE_AREA_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export type RenderWithProvidersOptions = {
  settings?: Partial<AppSettings>;
  themeMode?: ThemeMode;
  /**
   * Defaults to English, and deliberately not to the stored preference: a
   * component test asserts on copy, and pinning the language keeps it asserting
   * on the same copy on every machine. Pass another one to exercise a
   * translation or a right-to-left layout.
   */
  language?: LanguageCode;
  updateSettings?: SettingsContextValue['updateSettings'];
};

export function renderWithProviders(
  ui: React.ReactElement,
  {
    settings,
    themeMode = 'light',
    language = 'en',
    updateSettings,
  }: RenderWithProvidersOptions = {},
): Promise<RenderResult> {
  const value: SettingsContextValue = {
    settings: { ...FALLBACK_SETTINGS, onboardingCompleted: true, ...settings },
    isLoading: false,
    updateSettings: updateSettings ?? (async () => undefined),
    reloadSettings: async () => undefined,
  };

  function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <SettingsContext.Provider value={value}>
          <ThemeProvider mode={themeMode}>
            <I18nProvider language={language}>{children}</I18nProvider>
          </ThemeProvider>
        </SettingsContext.Provider>
      </SafeAreaProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

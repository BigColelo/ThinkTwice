import { render, type RenderResult } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import {
  FALLBACK_SETTINGS,
  SettingsContext,
  type SettingsContextValue,
} from '@/features/settings/SettingsProvider';
import { ThemeProvider } from '@/theme';
import type { AppSettings, ThemeMode } from '@/types/domain';

/**
 * Renders a component inside the providers it needs — theme and settings — but
 * without a database. Components below this level read money formatting and
 * theme from context, so supplying those two is enough to exercise them.
 */

const SAFE_AREA_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export type RenderWithProvidersOptions = {
  settings?: Partial<AppSettings>;
  themeMode?: ThemeMode;
  updateSettings?: SettingsContextValue['updateSettings'];
};

export function renderWithProviders(
  ui: React.ReactElement,
  { settings, themeMode = 'light', updateSettings }: RenderWithProvidersOptions = {},
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
          <ThemeProvider mode={themeMode}>{children}</ThemeProvider>
        </SettingsContext.Provider>
      </SafeAreaProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

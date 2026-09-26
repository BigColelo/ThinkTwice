import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { AppSettings } from '@/types/domain';

import { PreferencesProvider } from './PreferencesProvider';
import { FALLBACK_SETTINGS, SettingsContext } from './SettingsProvider';

/**
 * Every screen sits under this provider, so a stored preference that did not
 * reach it would be a setting that silently does nothing.
 */

function Probe(): React.ReactElement {
  const t = useT();
  const theme = useTheme();
  return <Text testID="probe">{`${t('common.cancel')} ${theme.isDark ? 'dark' : 'light'}`}</Text>;
}

function renderWith(settings: Partial<AppSettings>): ReturnType<typeof render> {
  return render(
    <SettingsContext.Provider
      value={{
        settings: { ...FALLBACK_SETTINGS, ...settings },
        isLoading: false,
        updateSettings: async () => undefined,
      }}
    >
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>
    </SettingsContext.Provider>,
  );
}

describe('PreferencesProvider', () => {
  it('applies the stored language and theme below it', async () => {
    await renderWith({ language: 'it', themeMode: 'dark' });

    expect(screen.getByTestId('probe')).toHaveTextContent('Annulla dark');
  });

  it('follows a change of preference without being remounted', async () => {
    const { rerender } = await renderWith({ language: 'de', themeMode: 'light' });
    expect(screen.getByTestId('probe')).toHaveTextContent('Abbrechen light');

    await rerender(
      <SettingsContext.Provider
        value={{
          settings: { ...FALLBACK_SETTINGS, language: 'fr', themeMode: 'dark' },
          isLoading: false,
          updateSettings: async () => undefined,
        }}
      >
        <PreferencesProvider>
          <Probe />
        </PreferencesProvider>
      </SettingsContext.Provider>,
    );

    expect(screen.getByTestId('probe')).toHaveTextContent('Annuler dark');
  });
});

import { screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Text } from 'react-native';

import {
  FALLBACK_SETTINGS,
  SettingsContext,
  type SettingsContextValue,
} from '@/features/settings/SettingsProvider';
import { renderWithProviders } from '@/test/renderWithProviders';

import { SettingsGate } from './SettingsGate';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(async () => undefined),
  preventAutoHideAsync: jest.fn(async () => undefined),
}));

/**
 * The second gate a launch passes through. What it guards against is invisible
 * when it works: a first frame painted in the device's theme and language, then
 * repainted a moment later in the user's.
 */

function renderGate(isLoading: boolean): ReturnType<typeof renderWithProviders> {
  const value: SettingsContextValue = {
    settings: { ...FALLBACK_SETTINGS, language: 'ar', themeMode: 'dark' },
    isLoading,
    updateSettings: async () => undefined,
  };

  return renderWithProviders(
    <SettingsContext.Provider value={value}>
      <SettingsGate>
        <Text>The app</Text>
      </SettingsGate>
    </SettingsContext.Provider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SettingsGate', () => {
  it('renders nothing of the app, and keeps the splash, until the settings are read', async () => {
    await renderGate(true);

    expect(screen.queryByText('The app')).toBeNull();
    expect(screen.getByLabelText('Opening your data')).toBeTruthy();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('renders the app and drops the splash once they are', async () => {
    await renderGate(false);

    expect(screen.getByText('The app')).toBeTruthy();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });
});

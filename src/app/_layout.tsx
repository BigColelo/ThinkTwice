import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@/db/DatabaseProvider';
import { AppErrorBoundary } from '@/features/errors/AppErrorBoundary';
import { AppChrome } from '@/features/navigation/AppChrome';
import { RootStack } from '@/features/navigation/RootStack';
import { PreferencesProvider } from '@/features/settings/PreferencesProvider';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { DatabaseGate } from '@/features/startup/DatabaseGate';
import { SettingsGate } from '@/features/startup/SettingsGate';
import { I18nProvider } from '@/i18n';
import { configureNotificationHandling } from '@/notifications/cooldownNotifications';
import { ThemeProvider } from '@/theme';

/**
 * Application root.
 *
 * Provider order matters: the database must be open before settings can be
 * read, and settings decide the theme and the language. Nothing below the two
 * gates renders before both have been read, so everything there can assume
 * storage is ready and preferences are loaded — and no first frame is painted
 * in the device's theme or language instead of the user's.
 *
 * Theme and language are each provided twice, for the same reason: the gate
 * above them renders real UI — a spinner, or an explanation of why the database
 * would not open — before any preference has been read. The outer pair follows
 * the device, the inner pair (`PreferencesProvider`) follows what the user chose.
 *
 * `AppErrorBoundary` sits just below the outer pair. It is the one component
 * that has to survive a crash anywhere in the app, so it renders with the
 * device's theme and language — the same footing as the gate — and re-mounts
 * everything below it when the user tries again.
 *
 * Every piece is a feature component; this file only puts them in order, so the
 * whole shape of the app can be read in one place.
 */

// Keeps the native splash up until the first screen is genuinely ready.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

configureNotificationHandling();

export default function RootLayout(): React.ReactElement {
  return (
    <SafeAreaProvider>
      {/* Bootstrap theme and language, so the loading and error gates are
          already themed and already in the device's language. */}
      <ThemeProvider mode="system">
        <I18nProvider language="system">
          <AppErrorBoundary>
            <DatabaseProvider>
              <DatabaseGate>
                <SettingsProvider>
                  <SettingsGate>
                    <PreferencesProvider>
                      <AppChrome>
                        <RootStack />
                      </AppChrome>
                    </PreferencesProvider>
                  </SettingsGate>
                </SettingsProvider>
              </DatabaseGate>
            </DatabaseProvider>
          </AppErrorBoundary>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

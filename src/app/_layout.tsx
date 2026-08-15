import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StatusBar as SystemStatusBar, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { DatabaseProvider, useDatabaseState, useRetryDatabase } from '@/db/DatabaseProvider';
import { SettingsProvider, useSettings } from '@/features/settings/SettingsProvider';
import {
  configureNotificationHandling,
  subscribeToCooldownReminderTaps,
} from '@/notifications/cooldownNotifications';
import { ThemeProvider, useTheme } from '@/theme';

/**
 * Application root.
 *
 * Provider order matters: the database must be open before settings can be
 * read, and settings decide the theme. Everything below the gate can assume
 * storage is ready and preferences are loaded.
 */

// Keeps the native splash up until the first screen is genuinely ready.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

configureNotificationHandling();

export default function RootLayout(): React.ReactElement {
  return (
    <SafeAreaProvider>
      {/* Bootstrap theme, so the loading and error gates are already themed. */}
      <ThemeProvider mode="system">
        <DatabaseProvider>
          <DatabaseGate>
            <SettingsProvider>
              <ThemedApp />
            </SettingsProvider>
          </DatabaseGate>
        </DatabaseProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Blocks the app until the local database is open, and explains it if it is not. */
function DatabaseGate({ children }: { children: React.ReactNode }): React.ReactElement {
  const state = useDatabaseState();
  const retry = useRetryDatabase();
  const theme = useTheme();

  useEffect(() => {
    if (state.status !== 'loading') void SplashScreen.hideAsync().catch(() => undefined);
  }, [state.status]);

  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
        <LoadingState label="Opening your data" />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          padding: theme.screenPadding,
        }}
      >
        <ErrorState
          title="Your data could not be opened"
          description="ThinkTwice stores everything on this device. Restarting the app usually resolves this."
          onRetry={retry}
        />
        <AppText variant="caption" color="tertiary" align="center">
          {state.error.message}
        </AppText>
      </View>
    );
  }

  return <>{children}</>;
}

function ThemedApp(): React.ReactElement {
  const { settings, isLoading } = useSettings();

  return (
    <ThemeProvider mode={settings.themeMode}>
      <AppChrome isSettingsLoading={isLoading} onboardingCompleted={settings.onboardingCompleted} />
    </ThemeProvider>
  );
}

function AppChrome({
  isSettingsLoading,
  onboardingCompleted,
}: {
  isSettingsLoading: boolean;
  onboardingCompleted: boolean;
}): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  useOnboardingRedirect(isSettingsLoading, onboardingCompleted);
  useReminderRouting();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* The strip behind the status bar is the app's accent, in both schemes: it
          is the one piece of chrome present on every screen, so it carries the
          brand instead of each screen painting its own top edge. Owning it here
          is also why no screen adds the top inset itself. */}
      <View style={{ height: insets.top, backgroundColor: theme.colors.accent.base }} />

      {/* Always light: the icons sit on the accent, never on the page. */}
      <StatusBar style="light" />
      {/* The same accent, handed to the system instead of painted, for the
          platforms that do not lay the app out behind the status bar: there the
          top inset is zero, so the strip above collapses and the brand would
          simply vanish. The two never both apply — this prop is ignored from
          Android 15 on, which is exactly where edge-to-edge makes the strip
          real. */}
      <SystemStatusBar backgroundColor={theme.colors.accent.base} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen
          name="add/index"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="add/wishlist" />
        <Stack.Screen name="add/purchase" />
        <Stack.Screen name="wishlist/index" />
        <Stack.Screen name="wishlist/[id]" />
        <Stack.Screen name="wishlist/edit/[id]" />
        <Stack.Screen name="purchase/[id]" />
        <Stack.Screen name="purchase/edit/[id]" />
        <Stack.Screen
          name="money/commitment"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="settings/index" />
      </Stack>
    </View>
  );
}

/**
 * Opens the item a reminder is about when its notification is tapped, including
 * the tap that launched the app.
 *
 * A reminder exists to bring the user back to a decision; leaving them on Home
 * to find the item themselves would waste the only interruption the app allows
 * itself. Where reminders do not exist — web, Expo Go on Android — the
 * subscription is a no-op.
 */
function useReminderRouting(): void {
  const router = useRouter();

  useEffect(
    () =>
      subscribeToCooldownReminderTaps(({ wishlistItemId }) => {
        router.push(`/wishlist/${wishlistItemId}`);
      }),
    [router],
  );
}

/**
 * Sends first-time users to onboarding and keeps returning users out of it.
 * Implemented as a redirect rather than a separate navigator so every route
 * stays reachable by URL, which is what makes deep links and web work.
 */
function useOnboardingRedirect(isLoading: boolean, onboardingCompleted: boolean): void {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const isOnOnboarding = segments[0] === 'onboarding';

    if (!onboardingCompleted && !isOnOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingCompleted && isOnOnboarding) {
      router.replace('/');
    }
  }, [isLoading, onboardingCompleted, segments, router]);
}

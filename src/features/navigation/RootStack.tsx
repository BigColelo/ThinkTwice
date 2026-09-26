import { Stack } from 'expo-router';
import React from 'react';

import { useSettings } from '@/features/settings/SettingsProvider';
import { useTheme } from '@/theme';

import { useOnboardingRedirect } from './useOnboardingRedirect';
import { useReminderRouting } from './useReminderRouting';

/**
 * The navigator every route renders in, and how each one is presented.
 *
 * A route file under `src/app` is only reachable once it is registered here:
 * the file gives it a URL, the entry below gives it its animation and whether it
 * is a card or a sheet. It lives outside `src/app` because it has to read the
 * theme the user chose, which only exists below the providers the root layout
 * sets up — and a route file holds its default export and nothing else.
 */
export function RootStack(): React.ReactElement {
  const theme = useTheme();
  const { settings, isLoading } = useSettings();

  useOnboardingRedirect(isLoading, settings.onboardingCompleted);
  useReminderRouting();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
        // A replace in this app is always a step back or sideways, never
        // deeper: the fallback in `useGoBack` when there is nothing to pop, a
        // form closing onto the item it just saved, an item that stopped being
        // a wishlist entry. Expo Router defaults this to `push`, which makes
        // the back control move the screen forwards. Read from the screen
        // being replaced *in*, so declaring it once here covers every target.
        animationTypeForReplace: 'pop',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      {/* The add flow is a sheet from every entrance, declared rather than
          left implicit. Expo Router marks every screen after a modal as a
          modal too — it has to, since a screen presented with `push` would go
          into the stack *behind* the sheet and never be seen — so a form with
          no options would be a card when opened from Home and a sheet when
          opened from the tab bar, and as an implicit modal it would animate
          sideways while dismissing downwards. Saying it once fixes both. */}
      <Stack.Screen
        name="add/index"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="add/wishlist"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="add/purchase"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
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
      <Stack.Screen name="settings/currency" />
      <Stack.Screen name="settings/language" />
    </Stack>
  );
}

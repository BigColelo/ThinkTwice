import { useEffect } from 'react';

import { subscribeToCooldownReminderTaps } from '@/notifications/cooldownNotifications';

import { useAppRouter } from './useAppRouter';

/**
 * Opens the item a reminder is about when its notification is tapped, including
 * the tap that launched the app.
 *
 * A reminder exists to bring the user back to a decision; leaving them on Home
 * to find the item themselves would waste the only interruption the app allows
 * itself. Where reminders do not exist — web, Expo Go on Android — the
 * subscription is a no-op.
 */
export function useReminderRouting(): void {
  const router = useAppRouter();

  useEffect(
    () =>
      subscribeToCooldownReminderTaps(({ wishlistItemId }) => {
        router.push(`/wishlist/${wishlistItemId}`);
      }),
    [router],
  );
}

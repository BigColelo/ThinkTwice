import { isRunningInExpoGo } from 'expo';
import type { NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/i18n';
import type { WishlistItem } from '@/types/domain';
import { parseIso } from '@/utils/dates';

/**
 * Optional local reminders for the end of a reflection period.
 *
 * Design rules, all deliberate:
 * - Nothing is requested at launch. Permission is asked for the first time the
 *   user turns a reminder on, at the moment it would be useful.
 * - The cooldown itself never depends on notifications. Everything is derived
 *   from `cooldownEndsAt` and the system clock, so a denied permission, a
 *   disabled channel or an unsupported runtime costs the user nothing.
 * - Notifications are local only. Nothing leaves the device.
 *
 * The whole module is an adapter: wherever local scheduling is unavailable — web,
 * and Expo Go on Android — every function degrades to a no-op instead of throwing.
 */

const CHANNEL_ID = 'cooldown-reminders';

type NotificationsModule = typeof import('expo-notifications');

/** Why reminders are unavailable, so the UI can say so. `null` when they work. */
export type NotificationsUnavailableReason = 'platform' | 'expo_go';

export function localNotificationsUnavailableReason(): NotificationsUnavailableReason | null {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return 'platform';
  // SDK 53 removed the Android notification service from Expo Go, and the
  // package throws rather than degrading there — see `loadNotifications`.
  if (Platform.OS === 'android' && isRunningInExpoGo()) return 'expo_go';
  return null;
}

export function areLocalNotificationsSupported(): boolean {
  return localNotificationsUnavailableReason() === null;
}

/**
 * `expo-notifications` is loaded lazily, and only where it can work.
 *
 * A static import at the top of this file crashes the app at startup in Expo Go
 * on Android: the package registers a device-push-token listener while its own
 * module initialises, and that listener throws there. Since the root layout
 * imports this module, the throw happens before any screen renders and takes the
 * router down with it — surfacing as `Cannot read property 'ErrorBoundary' of
 * undefined`. Loading it behind the support check puts Expo Go on exactly the
 * same footing as web: no reminders, everything else untouched.
 *
 * The load is a lazy `require` rather than a dynamic `import()`. Metro compiles
 * both to the same deferred require, but Jest runs in a CommonJS VM where a
 * native `import()` throws — which would quietly turn every reminder in this file
 * into a no-op under test, in the one module whose failure modes most need
 * checking. The `Promise.resolve().then` keeps the module off the current tick,
 * exactly as the dynamic import did.
 */
let modulePromise: Promise<NotificationsModule | null> | null = null;

function loadNotifications(): Promise<NotificationsModule | null> {
  if (!areLocalNotificationsSupported()) return Promise.resolve(null);
  // A failure is cached as `null` rather than retried: a runtime that cannot
  // load the module will not start being able to.
  modulePromise ??= Promise.resolve().then(() => {
    try {
      // The deferral is the point — see above; a static import cannot be used here.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('expo-notifications') as NotificationsModule;
    } catch {
      return null;
    }
  });
  return modulePromise;
}

/** Deterministic id per item, so a reminder can be replaced or cancelled without storing it. */
function notificationIdFor(wishlistItemId: string): string {
  return `thinktwice-cooldown-${wishlistItemId}`;
}

/**
 * Installs the foreground presentation rules. Called once from the app root;
 * it does not request permission and does not prompt the user.
 */
export function configureNotificationHandling(): void {
  void loadNotifications().then((notifications) => {
    if (!notifications) return;

    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      void notifications
        .setNotificationChannelAsync(CHANNEL_ID, {
          name: t('notifications.channelName'),
          importance: notifications.AndroidImportance.DEFAULT,
          lightColor: '#6D3FF3',
          vibrationPattern: [0, 200],
        })
        .catch(() => undefined);
    }
  });
}

/** Re-applies the channel name in the current language. Android only; a no-op elsewhere. */
async function renameNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const notifications = await loadNotifications();
  if (!notifications) return;

  try {
    await notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t('notifications.channelName'),
      importance: notifications.AndroidImportance.DEFAULT,
      lightColor: '#6D3FF3',
      vibrationPattern: [0, 200],
    });
  } catch {
    // A channel that keeps its old name is not worth failing a language change.
  }
}

/** The item a tapped reminder refers to. */
export type CooldownReminderTarget = { wishlistItemId: string };

function reminderTargetOf(
  response: NotificationResponse | null | undefined,
): CooldownReminderTarget | null {
  // The payload comes back from the OS, so it is treated like any other
  // untrusted input rather than assumed to be what was scheduled.
  const id = response?.notification.request.content.data?.wishlistItemId;
  return typeof id === 'string' && id !== '' ? { wishlistItemId: id } : null;
}

/**
 * Calls `onOpen` when the user taps a reflection reminder, and returns an
 * unsubscribe function.
 *
 * A tap that cold-starts the app is not delivered to the listener, so the most
 * recent response is read once as well — otherwise opening the app *from* a
 * reminder, which is the entire point of the reminder, would land on Home.
 * Responses are de-duplicated because the two paths can report the same tap.
 */
export function subscribeToCooldownReminderTaps(
  onOpen: (target: CooldownReminderTarget) => void,
): () => void {
  let subscription: { remove: () => void } | null = null;
  let cancelled = false;
  let handled: string | null = null;

  const deliver = (response: NotificationResponse | null | undefined): void => {
    const target = reminderTargetOf(response);
    if (!target || cancelled || !response) return;

    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (key === handled) return;
    handled = key;

    onOpen(target);
  };

  void loadNotifications().then((notifications) => {
    if (!notifications || cancelled) return;

    subscription = notifications.addNotificationResponseReceivedListener(deliver);
    if (cancelled) {
      subscription.remove();
      return;
    }

    deliver(notifications.getLastNotificationResponse());
  });

  return () => {
    cancelled = true;
    subscription?.remove();
  };
}

export type PermissionOutcome = 'granted' | 'denied' | 'unsupported';

/** Returns the current permission state without prompting. */
export async function getNotificationPermission(): Promise<PermissionOutcome> {
  const notifications = await loadNotifications();
  if (!notifications) return 'unsupported';

  try {
    const { status } = await notifications.getPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Asks for permission, prompting only if it has not been decided yet.
 * Call this from the action that needs it, never at startup.
 */
export async function requestNotificationPermission(): Promise<PermissionOutcome> {
  const notifications = await loadNotifications();
  if (!notifications) return 'unsupported';

  try {
    const current = await notifications.getPermissionsAsync();
    if (current.status === 'granted') return 'granted';
    if (!current.canAskAgain) return 'denied';

    const requested = await notifications.requestPermissionsAsync();
    return requested.status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Schedules (or replaces) the reminder for one item.
 *
 * Returns `false` when nothing was scheduled — no permission, a runtime without
 * local notifications, or a reflection period that has already elapsed. Callers
 * treat that as informational, never as an error.
 */
export async function scheduleCooldownReminder(
  item: Pick<WishlistItem, 'id' | 'name' | 'cooldownEndsAt' | 'status'>,
): Promise<boolean> {
  if (item.status !== 'thinking') return false;

  const endsAt = parseIso(item.cooldownEndsAt);
  if (!endsAt || endsAt.getTime() <= Date.now()) return false;

  const notifications = await loadNotifications();
  if (!notifications) return false;

  if ((await getNotificationPermission()) !== 'granted') return false;

  try {
    await notifications.scheduleNotificationAsync({
      identifier: notificationIdFor(item.id),
      content: {
        title: t('notifications.cooldownTitle'),
        // Neutral by design: the reminder prompts a decision, it does not push one.
        body: t('notifications.cooldownBody', { name: item.name }),
        data: { wishlistItemId: item.id },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: endsAt,
      },
    });
    return true;
  } catch {
    // A failed reminder must never block the user from adding an item.
    return false;
  }
}

export async function cancelCooldownReminder(wishlistItemId: string): Promise<void> {
  const notifications = await loadNotifications();
  if (!notifications) return;

  try {
    await notifications.cancelScheduledNotificationAsync(notificationIdFor(wishlistItemId));
  } catch {
    // Cancelling something that was never scheduled is not a failure.
  }
}

/** Removes every reminder — used when the user turns reminders off or resets data. */
export async function cancelAllCooldownReminders(): Promise<void> {
  const notifications = await loadNotifications();
  if (!notifications) return;

  try {
    await notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Ignored for the same reason as above.
  }
}

/**
 * Re-schedules reminders for every item still in a reflection period.
 *
 * Used after the user enables reminders, so existing items are covered too, and
 * after a language change: a reminder's title and body are handed to the
 * operating system when it is scheduled and never read again, so a period that
 * runs for weeks would otherwise still fire in the previous language.
 */
export async function rescheduleAllCooldownReminders(
  items: readonly Pick<WishlistItem, 'id' | 'name' | 'cooldownEndsAt' | 'status'>[],
): Promise<number> {
  if (!areLocalNotificationsSupported()) return 0;

  // The Android channel name is set once at launch, so it carries the language
  // the app started in. Setting it again with the same id renames the existing
  // channel rather than creating a second one.
  await renameNotificationChannel();

  await cancelAllCooldownReminders();

  let scheduled = 0;
  for (const item of items) {
    if (await scheduleCooldownReminder(item)) scheduled += 1;
  }
  return scheduled;
}

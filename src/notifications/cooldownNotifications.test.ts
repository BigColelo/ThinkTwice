import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import type { NotificationPermissionsStatus, NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';

import type { WishlistItem } from '@/types/domain';

import {
  areLocalNotificationsSupported,
  cancelCooldownReminder,
  configureNotificationHandling,
  getNotificationPermission,
  localNotificationsUnavailableReason,
  requestNotificationPermission,
  rescheduleAllCooldownReminders,
  scheduleCooldownReminder,
  subscribeToCooldownReminderTaps,
} from './cooldownNotifications';

/**
 * The reminders adapter.
 *
 * Everything downstream of this file is already covered — the services assert
 * that a decision cancels its reminder and that an edit replaces it — but the
 * adapter itself holds the parts that fail quietly: three permission outcomes,
 * a payload that comes back from the OS and is therefore untrusted, a tap that
 * can be reported twice, and a runtime where none of it is available.
 *
 * `expo-notifications` is mocked whole. The real module is loaded lazily inside
 * the adapter, on purpose (a static import crashes Expo Go on Android), and the
 * mock is picked up by that dynamic import just the same.
 */

jest.mock('expo', () => ({ isRunningInExpoGo: jest.fn(() => false) }));

jest.mock('expo-notifications', () => ({
  __esModule: true,
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponse: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const mocked = {
  setNotificationHandler: jest.mocked(Notifications.setNotificationHandler),
  setNotificationChannelAsync: jest.mocked(Notifications.setNotificationChannelAsync),
  getPermissionsAsync: jest.mocked(Notifications.getPermissionsAsync),
  requestPermissionsAsync: jest.mocked(Notifications.requestPermissionsAsync),
  scheduleNotificationAsync: jest.mocked(Notifications.scheduleNotificationAsync),
  cancelScheduledNotificationAsync: jest.mocked(Notifications.cancelScheduledNotificationAsync),
  cancelAllScheduledNotificationsAsync: jest.mocked(
    Notifications.cancelAllScheduledNotificationsAsync,
  ),
  addNotificationResponseReceivedListener: jest.mocked(
    Notifications.addNotificationResponseReceivedListener,
  ),
  getLastNotificationResponse: jest.mocked(Notifications.getLastNotificationResponse),
  isRunningInExpoGo: jest.mocked(isRunningInExpoGo),
};

/** The adapter's async work is fired and not awaited, so tests wait for the queue. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const permission = (status: string, canAskAgain = true): NotificationPermissionsStatus =>
  ({
    status,
    canAskAgain,
    granted: status === 'granted',
    expires: 'never',
  }) as unknown as NotificationPermissionsStatus;

const subscription = { remove: jest.fn() };

/** A response as the OS hands it back: the payload is whatever is in there. */
function tapResponse(
  data: Record<string, unknown>,
  { identifier = 'thinktwice-cooldown-w1', date = 1_000 } = {},
): NotificationResponse {
  return {
    notification: { date, request: { identifier, content: { data } } },
  } as unknown as NotificationResponse;
}

function item(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: 'w1',
    name: 'Camera',
    priceCents: 179_900,
    categoryId: 'photography',
    imageUri: null,
    expectedUsageFrequency: 'several_times_week',
    customUsesPerMonth: null,
    expectedOwnershipMonths: 60,
    cooldownDays: 7,
    cooldownStartedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    cooldownEndsAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'thinking',
    reasonTags: [],
    notes: null,
    decidedAt: null,
    createdAt: '2026-08-06T09:00:00.000Z',
    updatedAt: '2026-08-06T09:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  subscription.remove.mockClear();

  // Defaults survive `clearAllMocks`, which only clears calls — so they are set
  // here rather than in the factory, where a test's override would leak forward.
  mocked.getPermissionsAsync.mockResolvedValue(permission('granted'));
  mocked.requestPermissionsAsync.mockResolvedValue(permission('granted'));
  mocked.scheduleNotificationAsync.mockResolvedValue('scheduled');
  mocked.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
  mocked.cancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);
  mocked.addNotificationResponseReceivedListener.mockReturnValue(subscription);
  mocked.getLastNotificationResponse.mockReturnValue(null);
  mocked.isRunningInExpoGo.mockReturnValue(false);
});

afterEach(() => {
  // Restores any `Platform.OS` a test replaced.
  jest.restoreAllMocks();
});

describe('configureNotificationHandling', () => {
  it('installs the foreground rules and asks for nothing', async () => {
    configureNotificationHandling();
    await flush();

    expect(mocked.setNotificationHandler).toHaveBeenCalledTimes(1);
    // The whole point of the design: no permission prompt at launch.
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('creates the Android channel only where there are channels', async () => {
    configureNotificationHandling();
    await flush();
    expect(mocked.setNotificationChannelAsync).not.toHaveBeenCalled();

    jest.replaceProperty(Platform, 'OS', 'android');
    configureNotificationHandling();
    await flush();

    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
      'cooldown-reminders',
      expect.objectContaining({ name: 'Reflection reminders' }),
    );
  });
});

describe('getNotificationPermission', () => {
  it('reports the current state without ever prompting', async () => {
    await expect(getNotificationPermission()).resolves.toBe('granted');

    mocked.getPermissionsAsync.mockResolvedValue(permission('undetermined'));
    await expect(getNotificationPermission()).resolves.toBe('denied');

    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('reads a failed check as denied rather than crashing the caller', async () => {
    mocked.getPermissionsAsync.mockRejectedValue(new Error('no permission module'));

    await expect(getNotificationPermission()).resolves.toBe('denied');
  });
});

describe('requestNotificationPermission', () => {
  it('does not prompt when permission is already granted', async () => {
    await expect(requestNotificationPermission()).resolves.toBe('granted');

    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('does not prompt when the system will not ask again', async () => {
    // The dialog would never appear; asking would just look like nothing happened.
    mocked.getPermissionsAsync.mockResolvedValue(permission('denied', false));

    await expect(requestNotificationPermission()).resolves.toBe('denied');
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('prompts once when undecided and reports the answer', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(permission('undetermined'));

    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);

    mocked.requestPermissionsAsync.mockResolvedValue(permission('denied'));
    await expect(requestNotificationPermission()).resolves.toBe('denied');
  });

  it('reads a failed request as denied', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(permission('undetermined'));
    mocked.requestPermissionsAsync.mockRejectedValue(new Error('unavailable'));

    await expect(requestNotificationPermission()).resolves.toBe('denied');
  });
});

describe('scheduleCooldownReminder', () => {
  it('schedules one reminder for the end of the period', async () => {
    const target = item();

    await expect(scheduleCooldownReminder(target)).resolves.toBe(true);

    const request = mocked.scheduleNotificationAsync.mock.calls[0]?.[0];
    // Derived from the item id, so a reminder can be replaced or cancelled later
    // without storing its identifier anywhere.
    expect(request?.identifier).toBe('thinktwice-cooldown-w1');
    expect(request?.content.data).toEqual({ wishlistItemId: 'w1' });
    expect(request?.content.body).toContain('Camera');
    expect(request?.trigger).toEqual(
      expect.objectContaining({ type: 'date', date: new Date(target.cooldownEndsAt) }),
    );
  });

  it('refuses an item that is no longer being thought about', async () => {
    await expect(scheduleCooldownReminder(item({ status: 'purchased' }))).resolves.toBe(false);
    await expect(scheduleCooldownReminder(item({ status: 'dismissed' }))).resolves.toBe(false);

    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('refuses a period that has already ended, or one it cannot read', async () => {
    const past = new Date(Date.now() - 60_000).toISOString();

    await expect(scheduleCooldownReminder(item({ cooldownEndsAt: past }))).resolves.toBe(false);
    await expect(scheduleCooldownReminder(item({ cooldownEndsAt: 'not-a-date' }))).resolves.toBe(
      false,
    );

    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('refuses without permission, and does not prompt for it here', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(permission('denied'));

    await expect(scheduleCooldownReminder(item())).resolves.toBe(false);

    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('reports a failed reminder instead of throwing at the caller', async () => {
    // Adding an item must not fail because a notification could not be scheduled.
    mocked.scheduleNotificationAsync.mockRejectedValue(new Error('quota'));

    await expect(scheduleCooldownReminder(item())).resolves.toBe(false);
  });
});

describe('cancelCooldownReminder', () => {
  it('cancels the reminder belonging to that item', async () => {
    await cancelCooldownReminder('w1');

    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith('thinktwice-cooldown-w1');
  });

  it('treats cancelling something that was never scheduled as success', async () => {
    mocked.cancelScheduledNotificationAsync.mockRejectedValue(new Error('unknown identifier'));

    await expect(cancelCooldownReminder('w1')).resolves.toBeUndefined();
  });
});

describe('rescheduleAllCooldownReminders', () => {
  it('clears everything first, then reports how many it really scheduled', async () => {
    const past = new Date(Date.now() - 60_000).toISOString();

    const scheduled = await rescheduleAllCooldownReminders([
      item({ id: 'a' }),
      item({ id: 'b', status: 'purchased' }),
      item({ id: 'c', cooldownEndsAt: past }),
    ]);

    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(scheduled).toBe(1);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});

describe('subscribeToCooldownReminderTaps', () => {
  it('opens the item a tap that launched the app refers to', async () => {
    // The listener never sees this one, which is why the last response is read too.
    mocked.getLastNotificationResponse.mockReturnValue(tapResponse({ wishlistItemId: 'w9' }));
    const onOpen = jest.fn();

    subscribeToCooldownReminderTaps(onOpen);
    await flush();

    expect(onOpen).toHaveBeenCalledWith({ wishlistItemId: 'w9' });
  });

  it('ignores a payload without a usable id', async () => {
    const onOpen = jest.fn();
    subscribeToCooldownReminderTaps(onOpen);
    await flush();

    const deliver = mocked.addNotificationResponseReceivedListener.mock.calls[0]?.[0];
    deliver?.(tapResponse({}));
    deliver?.(tapResponse({ wishlistItemId: '' }));
    deliver?.(tapResponse({ wishlistItemId: 42 }));

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('delivers a tap once when both paths report the same one', async () => {
    const response = tapResponse({ wishlistItemId: 'w1' });
    mocked.getLastNotificationResponse.mockReturnValue(response);
    const onOpen = jest.fn();

    subscribeToCooldownReminderTaps(onOpen);
    await flush();

    const deliver = mocked.addNotificationResponseReceivedListener.mock.calls[0]?.[0];
    deliver?.(response);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('stops delivering once unsubscribed', async () => {
    const onOpen = jest.fn();
    const unsubscribe = subscribeToCooldownReminderTaps(onOpen);
    await flush();

    const deliver = mocked.addNotificationResponseReceivedListener.mock.calls[0]?.[0];
    unsubscribe();
    deliver?.(tapResponse({ wishlistItemId: 'w1' }));

    expect(subscription.remove).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe('runtimes without local notifications', () => {
  it('says why they are unavailable on web', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');

    expect(localNotificationsUnavailableReason()).toBe('platform');
    expect(areLocalNotificationsSupported()).toBe(false);
    await expect(scheduleCooldownReminder(item())).resolves.toBe(false);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('says why they are unavailable in Expo Go on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mocked.isRunningInExpoGo.mockReturnValue(true);

    expect(localNotificationsUnavailableReason()).toBe('expo_go');
    await expect(scheduleCooldownReminder(item())).resolves.toBe(false);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('works in an Android development build', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    expect(localNotificationsUnavailableReason()).toBeNull();
    await expect(scheduleCooldownReminder(item())).resolves.toBe(true);
  });

  it('cancelling and subscribing are no-ops rather than failures', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const onOpen = jest.fn();

    const unsubscribe = subscribeToCooldownReminderTaps(onOpen);
    await cancelCooldownReminder('w1');
    await flush();
    unsubscribe();

    expect(mocked.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(mocked.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });
});

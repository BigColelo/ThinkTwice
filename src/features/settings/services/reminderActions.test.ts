import { invalidate, resetRevisionsForTesting } from '@/db/dataRevisions';
import type { Repositories } from '@/db/repositories';
import { FALLBACK_SETTINGS } from '@/features/settings/SettingsProvider';
import {
  areLocalNotificationsSupported,
  cancelAllCooldownReminders,
  requestNotificationPermission,
  rescheduleAllCooldownReminders,
} from '@/notifications/cooldownNotifications';
import type { AppSettings, WishlistItem } from '@/types/domain';

import {
  disableCooldownReminders,
  enableCooldownReminders,
  refreshCooldownReminders,
} from './reminderActions';

/**
 * Reminders are the one feature whose state lives in two places — a setting in
 * the database and notifications held by the operating system — so what is
 * asserted is that the two never disagree: no setting stored without a
 * permission, no reminders left waiting after "off", and none left in the
 * previous language after a switch.
 */

jest.mock('@/db/dataRevisions', () => {
  const actual = jest.requireActual('@/db/dataRevisions');
  return { ...actual, invalidate: jest.fn(actual.invalidate) };
});

jest.mock('@/notifications/cooldownNotifications', () => ({
  areLocalNotificationsSupported: jest.fn(() => true),
  cancelAllCooldownReminders: jest.fn(async () => undefined),
  requestNotificationPermission: jest.fn(async () => 'granted'),
  rescheduleAllCooldownReminders: jest.fn(async (items: readonly unknown[]) => items.length),
}));

const invalidateMock = jest.mocked(invalidate);
const supportedMock = jest.mocked(areLocalNotificationsSupported);
const cancelAllMock = jest.mocked(cancelAllCooldownReminders);
const permissionMock = jest.mocked(requestNotificationPermission);
const rescheduleMock = jest.mocked(rescheduleAllCooldownReminders);

const OPEN_ITEMS = [{ id: 'w1' }, { id: 'w2' }] as WishlistItem[];

function createRepositories(settings: Partial<AppSettings> = {}): Repositories {
  return {
    settings: {
      get: jest.fn(async () => ({ ...FALLBACK_SETTINGS, ...settings })),
      update: jest.fn(async (update: Partial<AppSettings>) => ({
        ...FALLBACK_SETTINGS,
        ...settings,
        ...update,
      })),
    },
    wishlist: { listOpen: jest.fn(async () => OPEN_ITEMS) },
  } as unknown as Repositories;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetRevisionsForTesting();
  supportedMock.mockReturnValue(true);
  permissionMock.mockResolvedValue('granted');
});

describe('enableCooldownReminders', () => {
  it('stores the setting and covers the items already waiting', async () => {
    const repositories = createRepositories();

    const outcome = await enableCooldownReminders(repositories);

    expect(repositories.settings.update).toHaveBeenCalledWith({ cooldownRemindersEnabled: true });
    expect(rescheduleMock).toHaveBeenCalledWith(OPEN_ITEMS);
    expect(outcome).toEqual({ status: 'enabled', scheduled: 2 });
  });

  it('tells the settings provider, which is what moves the switch', async () => {
    await enableCooldownReminders(createRepositories());

    expect(invalidateMock).toHaveBeenCalledWith('settings');
  });

  it.each(['denied', 'unsupported'] as const)(
    'stores nothing when the permission is %s',
    async (permission) => {
      permissionMock.mockResolvedValueOnce(permission);
      const repositories = createRepositories();

      const outcome = await enableCooldownReminders(repositories);

      expect(outcome).toEqual({ status: permission });
      expect(repositories.settings.update).not.toHaveBeenCalled();
      expect(rescheduleMock).not.toHaveBeenCalled();
      expect(invalidateMock).not.toHaveBeenCalled();
    },
  );
});

describe('disableCooldownReminders', () => {
  it('stores the setting and takes back the reminders already scheduled', async () => {
    const repositories = createRepositories({ cooldownRemindersEnabled: true });

    await disableCooldownReminders(repositories);

    expect(repositories.settings.update).toHaveBeenCalledWith({
      cooldownRemindersEnabled: false,
    });
    expect(cancelAllMock).toHaveBeenCalledTimes(1);
    expect(invalidateMock).toHaveBeenCalledWith('settings');
  });
});

describe('refreshCooldownReminders', () => {
  it('re-issues every pending reminder when reminders are on', async () => {
    await refreshCooldownReminders(createRepositories({ cooldownRemindersEnabled: true }));

    expect(rescheduleMock).toHaveBeenCalledWith(OPEN_ITEMS);
  });

  it('leaves the operating system alone when reminders are off', async () => {
    await refreshCooldownReminders(createRepositories({ cooldownRemindersEnabled: false }));

    expect(rescheduleMock).not.toHaveBeenCalled();
  });

  it('reads nothing where reminders cannot exist', async () => {
    supportedMock.mockReturnValue(false);
    const repositories = createRepositories({ cooldownRemindersEnabled: true });

    await refreshCooldownReminders(repositories);

    expect(repositories.settings.get).not.toHaveBeenCalled();
    expect(rescheduleMock).not.toHaveBeenCalled();
  });

  it('writes nothing, since the language itself was already stored', async () => {
    const repositories = createRepositories({ cooldownRemindersEnabled: true });

    await refreshCooldownReminders(repositories);

    expect(repositories.settings.update).not.toHaveBeenCalled();
    expect(invalidateMock).not.toHaveBeenCalled();
  });
});

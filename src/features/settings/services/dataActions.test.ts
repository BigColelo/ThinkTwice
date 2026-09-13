import { invalidate, resetRevisionsForTesting } from '@/db/dataRevisions';
import type { Repositories } from '@/db/repositories';
import { deleteAllItemImages } from '@/features/images/itemImages';
import { cancelAllCooldownReminders } from '@/notifications/cooldownNotifications';

import { resetAllLocalData } from './dataActions';

/**
 * "Reset all local data" is the one action in the app that cannot be undone and
 * the one the app's whole privacy claim rests on: everything is on this device,
 * so this is the only way anything ever leaves.
 *
 * Rows are the easy part. What is asserted here is the rest — photos on the file
 * system, reminders held by the operating system, and every open screen still
 * showing what was deleted — because each of those is invisible from the screen
 * that triggers it, and each was a separate line someone had to remember.
 */

jest.mock('@/db/dataRevisions', () => {
  const actual = jest.requireActual('@/db/dataRevisions');
  return { ...actual, invalidate: jest.fn(actual.invalidate) };
});

jest.mock('@/features/images/itemImages', () => ({
  deleteAllItemImages: jest.fn(async () => undefined),
}));

jest.mock('@/notifications/cooldownNotifications', () => ({
  cancelAllCooldownReminders: jest.fn(async () => undefined),
}));

const invalidateMock = invalidate as jest.MockedFunction<typeof invalidate>;
const deleteImagesMock = jest.mocked(deleteAllItemImages);
const cancelRemindersMock = jest.mocked(cancelAllCooldownReminders);

function createHarness(): { repositories: Repositories; order: string[] } {
  const order: string[] = [];

  deleteImagesMock.mockImplementation(async () => {
    order.push('images');
  });
  cancelRemindersMock.mockImplementation(async () => {
    order.push('reminders');
  });
  invalidateMock.mockImplementation(() => {
    order.push('invalidate');
  });

  const repositories = {
    maintenance: {
      resetAllData: jest.fn(async () => {
        order.push('rows');
      }),
    },
  } as unknown as Repositories;

  return { repositories, order };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetRevisionsForTesting();
});

describe('resetAllLocalData', () => {
  it('deletes the rows, the photos and the pending reminders', async () => {
    const { repositories } = createHarness();

    await resetAllLocalData(repositories);

    expect(repositories.maintenance.resetAllData).toHaveBeenCalledTimes(1);
    // Photos live on the file system, so deleting rows leaves them behind.
    expect(deleteImagesMock).toHaveBeenCalledTimes(1);
    // A reminder outlives the app and would open an item that no longer exists.
    expect(cancelRemindersMock).toHaveBeenCalledTimes(1);
  });

  it('deletes the rows before the photos they refer to', async () => {
    // The other order leaves records pointing at pictures that are already gone,
    // if the app dies between the two.
    const { repositories, order } = createHarness();

    await resetAllLocalData(repositories);

    expect(order.indexOf('rows')).toBeLessThan(order.indexOf('images'));
  });

  it('tells every screen to re-read, and only once everything is gone', async () => {
    const { repositories, order } = createHarness();

    await resetAllLocalData(repositories);

    expect(invalidateMock).toHaveBeenCalledWith(
      'settings',
      'commitments',
      'wishlist',
      'purchases',
      'usage',
      'expenses',
    );
    expect(order).toEqual(['rows', 'images', 'reminders', 'invalidate']);
  });

  it('does not swallow a failed reset into a screen that says it worked', async () => {
    const { repositories } = createHarness();
    jest
      .mocked(repositories.maintenance.resetAllData)
      .mockRejectedValueOnce(new Error('database is locked'));

    await expect(resetAllLocalData(repositories)).rejects.toThrow('database is locked');
    // Nothing else ran, so the photos of records that still exist are still there.
    expect(deleteImagesMock).not.toHaveBeenCalled();
    expect(invalidateMock).not.toHaveBeenCalled();
  });
});

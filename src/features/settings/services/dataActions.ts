import { invalidate } from '@/db/dataRevisions';
import type { Repositories } from '@/db/repositories';
import { deleteAllItemImages } from '@/features/images/itemImages';
import { cancelAllCooldownReminders } from '@/notifications/cooldownNotifications';

/**
 * Taking it all back.
 *
 * Deleting the rows is only the first of four things a reset has to do, and the
 * other three are easy to forget one at a time: photos live on the file system
 * rather than in the database, reminders live in the operating system, and every
 * open screen is still showing what was just deleted. The Settings screen used
 * to run all four in sequence itself, holding a raw database handle to do it.
 *
 * The order matters. Rows go first, because they are what refers to the photos;
 * if the app died between the two steps, the photos would be orphaned files
 * rather than pictures missing from records that still exist. Invalidation goes
 * last, so nothing re-reads halfway through.
 */
export async function resetAllLocalData(repositories: Repositories): Promise<void> {
  await repositories.maintenance.resetAllData();

  // Nothing references these any more, so they are no longer the user's photos
  // of anything — they are bytes on disk the app promised to remove.
  await deleteAllItemImages();

  // A reminder outlives the app: the item it points at is gone, so firing would
  // send the user to a screen that cannot be opened.
  await cancelAllCooldownReminders();

  invalidate('settings', 'commitments', 'wishlist', 'purchases', 'usage', 'expenses');
}

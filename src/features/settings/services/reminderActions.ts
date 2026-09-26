import { invalidate } from '@/db/dataRevisions';
import type { Repositories } from '@/db/repositories';
import {
  areLocalNotificationsSupported,
  cancelAllCooldownReminders,
  requestNotificationPermission,
  rescheduleAllCooldownReminders,
} from '@/notifications/cooldownNotifications';

/**
 * Cooldown reminders: turning them on and off, and keeping the ones already
 * handed to the operating system in step with the app.
 *
 * Each of these is more than the setting it flips. Turning reminders on asks for
 * a permission and covers the items already waiting; turning them off takes the
 * pending ones back; a language change re-issues them, because their words were
 * frozen when they were scheduled. Two screens used to carry that knowledge
 * themselves, each reading the open items straight from the repository.
 *
 * The setting is written through the repository and named on the invalidation
 * bus, which is how the settings provider — and with it the switch — learns of it.
 */

export type EnableRemindersOutcome =
  { status: 'enabled'; scheduled: number } | { status: 'denied' } | { status: 'unsupported' };

export async function enableCooldownReminders(
  repositories: Repositories,
): Promise<EnableRemindersOutcome> {
  // Permission is requested here — the moment it becomes useful — rather than
  // at first launch. Without it nothing is stored: the switch stays off, and
  // the outcome says why.
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return { status: permission };

  await repositories.settings.update({ cooldownRemindersEnabled: true });
  invalidate('settings');

  // Items already in a reflection period were created before permission
  // existed, so nothing was scheduled for them. Cover them now, otherwise
  // "reminders on" would only apply to items added from here on.
  const scheduled = await rescheduleAllCooldownReminders(await repositories.wishlist.listOpen());
  return { status: 'enabled', scheduled };
}

export async function disableCooldownReminders(repositories: Repositories): Promise<void> {
  await repositories.settings.update({ cooldownRemindersEnabled: false });
  invalidate('settings');

  // Off means off for the ones already waiting too, not only for new items.
  await cancelAllCooldownReminders();
}

/**
 * Re-issues every pending reminder in the language now applied.
 *
 * A reminder's title and body are handed to the operating system when it is
 * scheduled and never read again, and a reflection period can run for months.
 * Call it once the new language is in effect; with reminders off, or where they
 * do not exist, there is nothing to re-issue.
 */
export async function refreshCooldownReminders(repositories: Repositories): Promise<void> {
  if (!areLocalNotificationsSupported()) return;

  const settings = await repositories.settings.get();
  if (!settings.cooldownRemindersEnabled) return;

  await rescheduleAllCooldownReminders(await repositories.wishlist.listOpen());
}

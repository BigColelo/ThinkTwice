import { invalidate } from '@/db/dataRevisions';
import type { NewWishlistItem, Repositories } from '@/db/repositories';
import { buildPurchaseFromWishlistItem, calculateCooldownEnd } from '@/domain';
import { deleteItemImage, persistItemImage } from '@/features/images/itemImages';
import {
  cancelCooldownReminder,
  scheduleCooldownReminder,
} from '@/notifications/cooldownNotifications';
import type { Cents, IsoDate, PurchaseWithStats, WishlistItem } from '@/types/domain';
import { nowIso } from '@/utils/dates';

/**
 * Wishlist write operations.
 *
 * These sit between the screens and the repositories, and own the parts a
 * single repository cannot: keeping the reminder in step with the reflection
 * period, preserving history when an item becomes a purchase, and telling the
 * rest of the app what changed.
 */

export type CreateWishlistItemInput = Omit<
  NewWishlistItem,
  'cooldownStartedAt' | 'cooldownEndsAt'
> & {
  cooldownDays: number;
};

export async function createWishlistItem(
  repositories: Repositories,
  input: CreateWishlistItemInput,
  options: { scheduleReminder: boolean },
): Promise<WishlistItem> {
  const cooldown = calculateCooldownEnd(input.cooldownDays);

  const item = await repositories.wishlist.create({
    ...input,
    // Copied into app storage only now, so a form the user abandoned never
    // leaves a photo behind.
    imageUri: await persistItemImage(input.imageUri),
    cooldownStartedAt: cooldown.startedAt,
    cooldownEndsAt: cooldown.endsAt,
  });

  invalidate('wishlist');

  if (options.scheduleReminder) {
    // A reminder is a convenience. If it cannot be scheduled the item is still
    // saved and the countdown still works, so the result is not awaited on.
    void scheduleCooldownReminder(item);
  }

  return item;
}

/** "I don't want it anymore." Keeps the record; it is part of the user's history. */
export async function dismissWishlistItem(
  repositories: Repositories,
  itemId: string,
): Promise<void> {
  await repositories.wishlist.markDecided(itemId, 'dismissed');
  await cancelCooldownReminder(itemId);
  invalidate('wishlist');
}

export type ConvertToPurchaseOptions = {
  purchaseDate?: IsoDate;
  actualPriceCents?: Cents;
};

/**
 * "I bought it." Creates the purchase, marks the wishlist item as purchased and
 * links the two, so the original expectation stays available for comparison.
 */
export async function convertWishlistItemToPurchase(
  repositories: Repositories,
  item: WishlistItem,
  options: ConvertToPurchaseOptions = {},
): Promise<PurchaseWithStats> {
  const existing = await repositories.purchases.findByWishlistItemId(item.id);
  if (existing) {
    // Guards against a double tap creating two purchases from one item.
    return existing;
  }

  const draft = buildPurchaseFromWishlistItem(item, options);
  const purchase = await repositories.purchases.create(draft);

  await repositories.wishlist.markDecided(item.id, 'purchased', nowIso());
  await cancelCooldownReminder(item.id);

  invalidate('wishlist', 'purchases');
  return purchase;
}

/** Removes an item entirely, including any image the app stored for it. */
export async function deleteWishlistItem(
  repositories: Repositories,
  item: Pick<WishlistItem, 'id' | 'imageUri'>,
): Promise<void> {
  await repositories.wishlist.remove(item.id);
  await cancelCooldownReminder(item.id);
  await deleteItemImage(item.imageUri);
  invalidate('wishlist');
}

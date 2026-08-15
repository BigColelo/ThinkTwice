import { invalidate } from '@/db/dataRevisions';
import type { NewWishlistItem, Repositories } from '@/db/repositories';
import {
  buildPurchaseFromWishlistItem,
  calculateCooldownEnd,
  isDecided,
  resolveWishlistStatus,
  reviseCooldownForPrice,
  type MonthlyFinances,
} from '@/domain';
import { deleteItemImage, persistItemImage } from '@/features/images/itemImages';
import {
  cancelCooldownReminder,
  scheduleCooldownReminder,
} from '@/notifications/cooldownNotifications';
import type {
  Cents,
  IsoDate,
  IsoTimestamp,
  PurchaseWithStats,
  WishlistItem,
  WishlistStatus,
} from '@/types/domain';
import { nowIso, parseIso } from '@/utils/dates';

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

/** An edit supplies exactly what the create form does — the same form, prefilled. */
export type UpdateWishlistItemInput = CreateWishlistItemInput;

/**
 * Applies an edit to an item still under reflection.
 *
 * The interesting part is the period. Everything except the price and the period
 * itself is a correction — a better name, the photo that was missing, a revised
 * guess at how often it will be used — and corrections never touch the
 * countdown. The price is different: the period was derived from it, so the
 * domain decides whether it still fits, always measuring from the original start
 * so time already spent is never taken away.
 *
 * A decided item is history and is refused rather than quietly rewritten.
 */
export async function updateWishlistItem(
  repositories: Repositories,
  item: WishlistItem,
  input: UpdateWishlistItemInput,
  options: { scheduleReminder: boolean; finances: MonthlyFinances | null },
): Promise<WishlistItem> {
  if (isDecided(item.status)) {
    throw new Error('A decided item can no longer be edited.');
  }

  // Idempotent for a URI already in app storage, so an untouched photo is not
  // copied a second time.
  const imageUri = await persistItemImage(input.imageUri);
  const replacedImageUri = item.imageUri !== imageUri ? item.imageUri : null;

  const period = resolveEditedPeriod(item, input, options.finances);

  const updated = await repositories.wishlist.update(item.id, {
    name: input.name,
    priceCents: input.priceCents,
    categoryId: input.categoryId,
    imageUri,
    expectedUsageFrequency: input.expectedUsageFrequency,
    customUsesPerMonth: input.customUsesPerMonth,
    expectedOwnershipMonths: input.expectedOwnershipMonths,
    reasonTags: input.reasonTags,
    notes: input.notes,
    ...period,
  });

  if (!updated) throw new Error('This item could no longer be found.');

  // Only once the new one is safely stored, and only if it was really replaced.
  await deleteItemImage(replacedImageUri);

  invalidate('wishlist');

  // The scheduled reminder carries the item's name and fires at its end date,
  // so either change makes the pending one wrong.
  if (period != null || updated.name !== item.name) {
    await cancelCooldownReminder(item.id);
    if (options.scheduleReminder) void scheduleCooldownReminder(updated);
  }

  return updated;
}

/**
 * The period fields an edit should write, or `undefined` to leave the countdown
 * exactly as it is.
 *
 * A period the user picked themselves is honoured as picked, measured from the
 * original start — so choosing "14 days" on day three leaves eleven, not
 * fourteen. The stored status is rewritten alongside it because it gates the
 * reminder: an item whose period has been extended is back to `thinking`, and a
 * reminder can only be scheduled for an item in that state.
 */
function resolveEditedPeriod(
  item: WishlistItem,
  input: UpdateWishlistItemInput,
  finances: MonthlyFinances | null,
): { cooldownDays: number; cooldownEndsAt: IsoTimestamp; status: WishlistStatus } | undefined {
  const startedAt = parseIso(item.cooldownStartedAt);
  if (!startedAt) return undefined;

  const chosenDays = Math.round(input.cooldownDays);

  if (chosenDays !== item.cooldownDays) {
    const { endsAt } = calculateCooldownEnd(chosenDays, startedAt);
    return { cooldownDays: chosenDays, cooldownEndsAt: endsAt, status: statusFor(endsAt) };
  }

  const revision = reviseCooldownForPrice({
    cooldownDays: item.cooldownDays,
    cooldownStartedAt: item.cooldownStartedAt,
    previousPriceCents: item.priceCents,
    newPriceCents: input.priceCents,
    finances,
  });
  if (!revision) return undefined;

  return {
    cooldownDays: revision.cooldownDays,
    cooldownEndsAt: revision.cooldownEndsAt,
    status: statusFor(revision.cooldownEndsAt),
  };
}

function statusFor(cooldownEndsAt: IsoTimestamp): WishlistStatus {
  return resolveWishlistStatus({ status: 'thinking', cooldownEndsAt });
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
    // Two things land here: a double tap, and a retry after the app died between
    // the two writes below — they are not in one transaction because a service
    // holds repositories, not the database handle.
    //
    // In the second case the item is still open, and returning early would leave
    // it in the wishlist *and* in Purchases permanently, with every later "I
    // bought it" doing nothing. So the decision is re-applied rather than
    // assumed to have been recorded.
    if (item.status !== 'purchased') {
      await repositories.wishlist.markDecided(item.id, 'purchased', nowIso());
      await cancelCooldownReminder(item.id);
      invalidate('wishlist');
    }
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
  // Becoming a purchase copies the image *URI*, not the file, so the two rows
  // can share one photo. Whoever is deleted first must leave it alone if the
  // other still points at it. Read before the delete: the purchase's
  // `wishlist_item_id` is `ON DELETE SET NULL`, so afterwards the link is gone.
  const purchase = await repositories.purchases.findByWishlistItemId(item.id);
  const isImageShared = item.imageUri != null && purchase?.imageUri === item.imageUri;

  await repositories.wishlist.remove(item.id);
  await cancelCooldownReminder(item.id);
  if (!isImageShared) await deleteItemImage(item.imageUri);
  invalidate('wishlist');
}

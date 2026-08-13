import type { IsoDate, Purchase, WishlistItem } from '@/types/domain';
import { todayIsoDate } from '@/utils/dates';

/**
 * Turning a wishlist item into a purchase.
 *
 * The wishlist item is kept (marked `purchased` and linked) rather than
 * deleted: the original expectation — expected usage, expected ownership, the
 * reflection period the user chose — is the only record of what they thought
 * before buying, and comparing it with reality is the point of the app.
 */

export type PurchaseDraft = Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>;

export type ConvertWishlistItemOptions = {
  /** Defaults to today. Lets the user record a purchase made a few days ago. */
  purchaseDate?: IsoDate;
  /** Defaults to the wishlist price; the user may have paid a different amount. */
  actualPriceCents?: number;
};

export function buildPurchaseFromWishlistItem(
  item: WishlistItem,
  options: ConvertWishlistItemOptions = {},
): PurchaseDraft {
  return {
    wishlistItemId: item.id,
    name: item.name,
    purchasePriceCents: options.actualPriceCents ?? item.priceCents,
    purchaseDate: options.purchaseDate ?? todayIsoDate(),
    categoryId: item.categoryId,
    imageUri: item.imageUri,
    expectedUsageFrequency: item.expectedUsageFrequency,
    customUsesPerMonth: item.customUsesPerMonth,
    expectedOwnershipMonths: item.expectedOwnershipMonths,
    currentResaleValueCents: null,
  };
}

/**
 * The status a wishlist item should have right now.
 *
 * `thinking` becomes `ready_to_decide` purely as a function of the clock, so a
 * missed background task or a device that was switched off changes nothing.
 * Decided items (`purchased`, `dismissed`) are terminal.
 */
export function resolveWishlistStatus(
  item: Pick<WishlistItem, 'status' | 'cooldownEndsAt'>,
  now: Date = new Date(),
): WishlistItem['status'] {
  if (item.status === 'purchased' || item.status === 'dismissed') return item.status;

  const endsAt = Date.parse(item.cooldownEndsAt);
  if (Number.isNaN(endsAt)) return 'ready_to_decide';

  return endsAt <= now.getTime() ? 'ready_to_decide' : 'thinking';
}

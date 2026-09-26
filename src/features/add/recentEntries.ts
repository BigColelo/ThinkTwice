import type { Cents, CategoryId, Purchase, WishlistItem } from '@/types/domain';

/**
 * The shortcuts under the add question: the last few things the user was already
 * dealing with, whichever half of the app they live in.
 *
 * The two halves describe an item differently — a wishlist item has a price, a
 * purchase a purchase price — so each is reduced here to the few fields a row
 * shows, and to the screen it opens. Items still under reflection come first:
 * they are the ones a user is most likely to be coming back to.
 */

export type RecentEntry = {
  /** Unique across both halves; a wishlist item and a purchase can share an id. */
  key: string;
  kind: 'thinking' | 'owned';
  name: string;
  cents: Cents;
  categoryId: CategoryId;
  imageUri: string | null;
  href: `/wishlist/${string}` | `/purchase/${string}`;
};

/** How many shortcuts the add screen has room for. */
export const RECENT_ENTRIES_LIMIT = 4;

export function recentEntries(
  wishlistItems: readonly WishlistItem[],
  purchases: readonly Purchase[],
  limit: number = RECENT_ENTRIES_LIMIT,
): RecentEntry[] {
  return [
    ...wishlistItems.map((item): RecentEntry => ({
      key: `w-${item.id}`,
      kind: 'thinking',
      name: item.name,
      cents: item.priceCents,
      categoryId: item.categoryId,
      imageUri: item.imageUri,
      href: `/wishlist/${item.id}`,
    })),
    ...purchases.map((purchase): RecentEntry => ({
      key: `p-${purchase.id}`,
      kind: 'owned',
      name: purchase.name,
      cents: purchase.purchasePriceCents,
      categoryId: purchase.categoryId,
      imageUri: purchase.imageUri,
      href: `/purchase/${purchase.id}`,
    })),
  ].slice(0, limit);
}

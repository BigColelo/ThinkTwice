import type { Purchase, WishlistItem } from '@/types/domain';

import { RECENT_ENTRIES_LIMIT, recentEntries } from './recentEntries';

/**
 * Two halves of the app, two shapes of record, one list of shortcuts. What is
 * asserted is that each row carries the right figure and opens the right
 * screen — a purchase's price is its purchase price, not a wishlist field —
 * and that ids shared across the two tables never collide as keys.
 */

const wishlistItem = {
  id: 'x1',
  name: 'Camera',
  priceCents: 179_900,
  categoryId: 'photography',
  imageUri: null,
} as WishlistItem;

const purchase = {
  id: 'x1',
  name: 'Espresso machine',
  purchasePriceCents: 65_000,
  categoryId: 'home',
  imageUri: 'file:///espresso.jpg',
} as Purchase;

describe('recentEntries', () => {
  it('lists items under reflection first, then things owned', () => {
    const entries = recentEntries([wishlistItem], [purchase]);

    expect(entries.map((entry) => entry.kind)).toEqual(['thinking', 'owned']);
  });

  it('describes each record by the fields its row shows, and the screen it opens', () => {
    const [thinking, owned] = recentEntries([wishlistItem], [purchase]);

    expect(thinking).toMatchObject({ name: 'Camera', cents: 179_900, href: '/wishlist/x1' });
    expect(owned).toMatchObject({
      name: 'Espresso machine',
      cents: 65_000,
      imageUri: 'file:///espresso.jpg',
      href: '/purchase/x1',
    });
  });

  it('keeps the keys apart when a wishlist item and a purchase share an id', () => {
    const keys = recentEntries([wishlistItem], [purchase]).map((entry) => entry.key);

    expect(new Set(keys).size).toBe(2);
  });

  it(`stops at ${RECENT_ENTRIES_LIMIT}`, () => {
    const many = Array.from({ length: 3 }, (_, index) => ({ ...wishlistItem, id: `w${index}` }));
    const owned = Array.from({ length: 3 }, (_, index) => ({ ...purchase, id: `p${index}` }));

    expect(recentEntries(many, owned)).toHaveLength(RECENT_ENTRIES_LIMIT);
  });

  it('is empty when there is nothing recent', () => {
    expect(recentEntries([], [])).toEqual([]);
  });
});

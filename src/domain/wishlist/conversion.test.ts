import type { WishlistItem } from '@/types/domain';

import { buildPurchaseFromWishlistItem, resolveWishlistStatus } from './conversion';

function item(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: 'w1',
    name: 'Camera',
    priceCents: 179_900,
    categoryId: 'photography',
    imageUri: 'file:///images/camera.jpg',
    expectedUsageFrequency: 'several_times_week',
    customUsesPerMonth: null,
    expectedOwnershipMonths: 60,
    cooldownDays: 7,
    cooldownStartedAt: '2026-08-06T09:00:00.000Z',
    cooldownEndsAt: '2026-08-13T09:00:00.000Z',
    status: 'thinking',
    reasonTags: ['Hobby'],
    notes: 'For weekend trips.',
    decidedAt: null,
    createdAt: '2026-08-06T09:00:00.000Z',
    updatedAt: '2026-08-06T09:00:00.000Z',
    ...overrides,
  };
}

describe('buildPurchaseFromWishlistItem', () => {
  it('carries the original expectation across, so estimate and reality stay comparable', () => {
    const draft = buildPurchaseFromWishlistItem(item(), { purchaseDate: '2026-08-13' });

    expect(draft.wishlistItemId).toBe('w1');
    expect(draft.name).toBe('Camera');
    expect(draft.purchasePriceCents).toBe(179_900);
    expect(draft.categoryId).toBe('photography');
    expect(draft.imageUri).toBe('file:///images/camera.jpg');
    expect(draft.expectedUsageFrequency).toBe('several_times_week');
    expect(draft.expectedOwnershipMonths).toBe(60);
    expect(draft.purchaseDate).toBe('2026-08-13');
  });

  it('starts with no resale estimate', () => {
    expect(buildPurchaseFromWishlistItem(item()).currentResaleValueCents).toBeNull();
  });

  it('accepts a price different from the one on the wishlist', () => {
    const draft = buildPurchaseFromWishlistItem(item(), { actualPriceCents: 159_900 });
    expect(draft.purchasePriceCents).toBe(159_900);
  });

  it('preserves a custom usage rate', () => {
    const draft = buildPurchaseFromWishlistItem(
      item({ expectedUsageFrequency: 'custom', customUsesPerMonth: 9 }),
    );
    expect(draft.expectedUsageFrequency).toBe('custom');
    expect(draft.customUsesPerMonth).toBe(9);
  });
});

describe('resolveWishlistStatus', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');

  it('keeps an item in thinking while its period is running', () => {
    expect(
      resolveWishlistStatus(
        { status: 'thinking', cooldownEndsAt: '2026-08-20T09:00:00.000Z' },
        now,
      ),
    ).toBe('thinking');
  });

  it('promotes an item once its period has elapsed, without any stored change', () => {
    expect(
      resolveWishlistStatus(
        { status: 'thinking', cooldownEndsAt: '2026-08-13T09:00:00.000Z' },
        now,
      ),
    ).toBe('ready_to_decide');
  });

  it('leaves decided items alone', () => {
    expect(
      resolveWishlistStatus(
        { status: 'purchased', cooldownEndsAt: '2026-08-20T09:00:00.000Z' },
        now,
      ),
    ).toBe('purchased');
    expect(
      resolveWishlistStatus(
        { status: 'dismissed', cooldownEndsAt: '2026-08-20T09:00:00.000Z' },
        now,
      ),
    ).toBe('dismissed');
  });

  it('treats an unreadable end date as ready to decide rather than stuck', () => {
    expect(resolveWishlistStatus({ status: 'thinking', cooldownEndsAt: 'nonsense' }, now)).toBe(
      'ready_to_decide',
    );
  });
});

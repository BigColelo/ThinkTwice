import { resetRevisionsForTesting } from '@/db/dataRevisions';
import type { Repositories } from '@/db/repositories';
import {
  cancelCooldownReminder,
  scheduleCooldownReminder,
} from '@/notifications/cooldownNotifications';
import type { PurchaseWithStats, WishlistItem } from '@/types/domain';

import {
  convertWishlistItemToPurchase,
  createWishlistItem,
  dismissWishlistItem,
} from './wishlistActions';

jest.mock('@/notifications/cooldownNotifications', () => ({
  scheduleCooldownReminder: jest.fn(async () => true),
  cancelCooldownReminder: jest.fn(async () => undefined),
}));

jest.mock('@/features/images/itemImages', () => ({
  deleteItemImage: jest.fn(async () => undefined),
  // The real implementation copies the picked file into app storage at save
  // time; here it passes the URI straight through.
  persistItemImage: jest.fn(async (uri: string | null) => uri),
}));

/**
 * Workflow-level tests for the wishlist actions, against in-memory repositories.
 *
 * These cover the behaviour no single unit owns: that buying an item preserves
 * the original expectation, that a double tap cannot create two purchases, and
 * that a decision always cancels its reminder.
 */

function baseItem(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: 'w1',
    name: 'Camera',
    priceCents: 179_900,
    categoryId: 'photography',
    imageUri: null,
    expectedUsageFrequency: 'several_times_week',
    customUsesPerMonth: null,
    expectedOwnershipMonths: 60,
    cooldownDays: 7,
    cooldownStartedAt: '2026-08-06T09:00:00.000Z',
    cooldownEndsAt: '2026-08-13T09:00:00.000Z',
    status: 'thinking',
    reasonTags: ['Hobby'],
    notes: null,
    decidedAt: null,
    createdAt: '2026-08-06T09:00:00.000Z',
    updatedAt: '2026-08-06T09:00:00.000Z',
    ...overrides,
  };
}

type Harness = {
  repositories: Repositories;
  items: Map<string, WishlistItem>;
  purchases: PurchaseWithStats[];
};

function createHarness(initialItems: WishlistItem[] = []): Harness {
  const items = new Map(initialItems.map((item) => [item.id, item]));
  const purchases: PurchaseWithStats[] = [];
  let nextId = 1;

  const repositories = {
    wishlist: {
      create: jest.fn(async (input: Record<string, unknown>) => {
        const item = baseItem({ id: `w-${nextId++}`, ...(input as Partial<WishlistItem>) });
        items.set(item.id, item);
        return item;
      }),
      findById: jest.fn(async (id: string) => items.get(id) ?? null),
      markDecided: jest.fn(
        async (id: string, status: WishlistItem['status'], decidedAt: string) => {
          const existing = items.get(id);
          if (existing) items.set(id, { ...existing, status, decidedAt });
        },
      ),
      remove: jest.fn(async (id: string) => {
        items.delete(id);
      }),
    },
    purchases: {
      create: jest.fn(async (draft: Record<string, unknown>) => {
        const purchase = {
          id: `p-${nextId++}`,
          totalUses: 0,
          additionalExpensesCents: 0,
          lastUsedAt: null,
          createdAt: '2026-08-13T09:00:00.000Z',
          updatedAt: '2026-08-13T09:00:00.000Z',
          ...draft,
        } as PurchaseWithStats;
        purchases.push(purchase);
        return purchase;
      }),
      findByWishlistItemId: jest.fn(
        async (wishlistItemId: string) =>
          purchases.find((purchase) => purchase.wishlistItemId === wishlistItemId) ?? null,
      ),
    },
  } as unknown as Repositories;

  return { repositories, items, purchases };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetRevisionsForTesting();
});

describe('createWishlistItem', () => {
  it('derives the reflection period from the chosen number of days', async () => {
    const { repositories } = createHarness();

    await createWishlistItem(
      repositories,
      {
        name: 'Camera',
        priceCents: 179_900,
        categoryId: 'photography',
        imageUri: null,
        expectedUsageFrequency: 'several_times_week',
        customUsesPerMonth: null,
        expectedOwnershipMonths: 60,
        cooldownDays: 7,
        reasonTags: [],
        notes: null,
      },
      { scheduleReminder: false },
    );

    const call = (repositories.wishlist.create as jest.Mock).mock.calls[0]?.[0] as {
      cooldownStartedAt: string;
      cooldownEndsAt: string;
    };

    const elapsedDays =
      (Date.parse(call.cooldownEndsAt) - Date.parse(call.cooldownStartedAt)) /
      (24 * 60 * 60 * 1000);
    expect(Math.round(elapsedDays)).toBe(7);
  });

  it('schedules a reminder only when the user has enabled them', async () => {
    const { repositories } = createHarness();
    const input = {
      name: 'Camera',
      priceCents: 179_900,
      categoryId: 'photography',
      imageUri: null,
      expectedUsageFrequency: 'several_times_week' as const,
      customUsesPerMonth: null,
      expectedOwnershipMonths: 60,
      cooldownDays: 7,
      reasonTags: [],
      notes: null,
    };

    await createWishlistItem(repositories, input, { scheduleReminder: false });
    expect(scheduleCooldownReminder).not.toHaveBeenCalled();

    await createWishlistItem(repositories, input, { scheduleReminder: true });
    expect(scheduleCooldownReminder).toHaveBeenCalledTimes(1);
  });
});

describe('convertWishlistItemToPurchase', () => {
  it('carries the original expectation onto the purchase', async () => {
    const item = baseItem();
    const { repositories, purchases } = createHarness([item]);

    const purchase = await convertWishlistItemToPurchase(repositories, item, {
      purchaseDate: '2026-08-13',
    });

    expect(purchases).toHaveLength(1);
    expect(purchase.wishlistItemId).toBe('w1');
    expect(purchase.name).toBe('Camera');
    expect(purchase.purchasePriceCents).toBe(179_900);
    expect(purchase.expectedUsageFrequency).toBe('several_times_week');
    expect(purchase.expectedOwnershipMonths).toBe(60);
  });

  it('keeps the wishlist item as history rather than deleting it', async () => {
    const item = baseItem();
    const { repositories, items } = createHarness([item]);

    await convertWishlistItemToPurchase(repositories, item);

    expect(items.get('w1')?.status).toBe('purchased');
    expect(items.get('w1')?.decidedAt).not.toBeNull();
  });

  it('cancels the reminder once a decision has been made', async () => {
    const item = baseItem();
    const { repositories } = createHarness([item]);

    await convertWishlistItemToPurchase(repositories, item);

    expect(cancelCooldownReminder).toHaveBeenCalledWith('w1');
  });

  it('does not create a second purchase if the action runs twice', async () => {
    const item = baseItem();
    const { repositories, purchases } = createHarness([item]);

    const first = await convertWishlistItemToPurchase(repositories, item);
    const second = await convertWishlistItemToPurchase(repositories, item);

    expect(purchases).toHaveLength(1);
    expect(second.id).toBe(first.id);
  });

  it('finishes a conversion that was interrupted after the purchase was written', async () => {
    // The two writes are not one transaction, so the app can die between them.
    // The item is then still open while its purchase exists: without a repair it
    // would sit in the wishlist and in Purchases forever, and every later
    // "I bought it" would silently do nothing.
    const item = baseItem();
    const { repositories, items, purchases } = createHarness([item]);

    await repositories.purchases.create({
      name: item.name,
      purchasePriceCents: item.priceCents,
      purchaseDate: '2026-08-13',
      categoryId: item.categoryId,
      imageUri: null,
      currentResaleValueCents: null,
      wishlistItemId: item.id,
    });
    expect(items.get('w1')?.status).toBe('thinking');

    const purchase = await convertWishlistItemToPurchase(repositories, item);

    expect(purchases).toHaveLength(1);
    expect(purchase.wishlistItemId).toBe('w1');
    expect(items.get('w1')?.status).toBe('purchased');
    expect(items.get('w1')?.decidedAt).not.toBeNull();
    expect(cancelCooldownReminder).toHaveBeenCalledWith('w1');
  });

  it('accepts a price different from the one on the wishlist', async () => {
    const item = baseItem();
    const { repositories } = createHarness([item]);

    const purchase = await convertWishlistItemToPurchase(repositories, item, {
      actualPriceCents: 159_900,
    });

    expect(purchase.purchasePriceCents).toBe(159_900);
  });
});

describe('dismissWishlistItem', () => {
  it('records the decision and cancels the reminder', async () => {
    const item = baseItem();
    const { repositories, items } = createHarness([item]);

    await dismissWishlistItem(repositories, 'w1');

    expect(items.get('w1')?.status).toBe('dismissed');
    expect(cancelCooldownReminder).toHaveBeenCalledWith('w1');
  });
});

import { resetRevisionsForTesting } from '@/db/dataRevisions';
import type { Repositories } from '@/db/repositories';
import type { MonthlyFinances } from '@/domain';
import { deleteItemImage } from '@/features/images/itemImages';
import {
  cancelCooldownReminder,
  scheduleCooldownReminder,
} from '@/notifications/cooldownNotifications';
import type { PurchaseWithStats, WishlistItem } from '@/types/domain';

import {
  convertWishlistItemToPurchase,
  createWishlistItem,
  deleteWishlistItem,
  dismissWishlistItem,
  updateWishlistItem,
  type CreateWishlistItemInput,
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
      update: jest.fn(async (id: string, update: Partial<WishlistItem>) => {
        const existing = items.get(id);
        if (!existing) return null;
        const next = { ...existing, ...update, updatedAt: '2026-08-13T10:00:00.000Z' };
        items.set(id, next);
        return next;
      }),
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

describe('deleteWishlistItem', () => {
  it('removes the item, its reminder and the photo the app stored for it', async () => {
    const item = baseItem({ imageUri: 'file:///images/camera.jpg' });
    const { repositories, items } = createHarness([item]);

    await deleteWishlistItem(repositories, item);

    expect(items.has('w1')).toBe(false);
    expect(cancelCooldownReminder).toHaveBeenCalledWith('w1');
    // Otherwise the file would outlive every reference to it.
    expect(deleteItemImage).toHaveBeenCalledWith('file:///images/camera.jpg');
  });

  it('keeps the photo when the purchase this item became still shows it', async () => {
    // Conversion copies the URI, not the file. Deleting the item's history here
    // would otherwise leave the purchase pointing at a file that is gone.
    const item = baseItem({ imageUri: 'file:///images/camera.jpg' });
    const { repositories } = createHarness([item]);
    await convertWishlistItemToPurchase(repositories, item);
    jest.clearAllMocks();

    await deleteWishlistItem(repositories, item);

    expect(deleteItemImage).not.toHaveBeenCalledWith('file:///images/camera.jpg');
  });

  it('deletes the photo when the purchase made from it shows a different one', async () => {
    const item = baseItem({ imageUri: 'file:///images/camera.jpg' });
    const { repositories, purchases } = createHarness([item]);
    await convertWishlistItemToPurchase(repositories, item);
    // As if the purchase's photo had since been replaced.
    const purchase = purchases[0];
    if (purchase) purchase.imageUri = 'file:///images/other.jpg';
    jest.clearAllMocks();

    await deleteWishlistItem(repositories, item);

    expect(deleteItemImage).toHaveBeenCalledWith('file:///images/camera.jpg');
  });
});

describe('updateWishlistItem', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  const FINANCES: MonthlyFinances = {
    netIncomeCents: 165_000,
    commitmentsCents: 78_300,
    savingsTargetCents: null,
    availableAfterCommitmentsCents: 86_700,
    availableAfterSavingsGoalCents: null,
    availableToIncomeRatio: 86_700 / 165_000,
    commitmentsToIncomeRatio: 78_300 / 165_000,
    isIncomeConfigured: true,
    commitmentsExceedIncome: false,
  };

  // The service reads the real clock to decide whether a revised period is over,
  // so these fixtures are built relative to it rather than pinned to a date.
  const isoDaysFromNow = (days: number): string =>
    new Date(Date.now() + days * DAY_MS).toISOString();

  const periodLength = (startedAt: string, endsAt: string): number =>
    Math.round((Date.parse(endsAt) - Date.parse(startedAt)) / DAY_MS);

  function editableItem(overrides: Partial<WishlistItem> = {}): WishlistItem {
    // €50 with this financial picture is suggested three days, so the stored
    // period is the app's rather than the user's.
    return baseItem({
      priceCents: 5_000,
      cooldownDays: 3,
      cooldownStartedAt: isoDaysFromNow(-1),
      cooldownEndsAt: isoDaysFromNow(2),
      ...overrides,
    });
  }

  function editInput(overrides: Partial<CreateWishlistItemInput> = {}): CreateWishlistItemInput {
    return {
      name: 'Camera',
      priceCents: 5_000,
      categoryId: 'photography',
      imageUri: null,
      expectedUsageFrequency: 'several_times_week',
      customUsesPerMonth: null,
      expectedOwnershipMonths: 60,
      cooldownDays: 3,
      reasonTags: ['Hobby'],
      notes: null,
      ...overrides,
    };
  }

  it('leaves the countdown untouched when only a correction changes', async () => {
    const item = editableItem();
    const { repositories, items } = createHarness([item]);

    await updateWishlistItem(
      repositories,
      item,
      editInput({ notes: 'Check the second-hand price first.', expectedOwnershipMonths: 24 }),
      { scheduleReminder: true, finances: FINANCES },
    );

    const stored = items.get('w1');
    expect(stored?.notes).toBe('Check the second-hand price first.');
    expect(stored?.expectedOwnershipMonths).toBe(24);
    expect(stored?.cooldownEndsAt).toBe(item.cooldownEndsAt);
    expect(stored?.cooldownDays).toBe(3);
    // Nothing the reminder depends on changed, so it is left alone.
    expect(cancelCooldownReminder).not.toHaveBeenCalled();
    expect(scheduleCooldownReminder).not.toHaveBeenCalled();
  });

  it('extends the period from its original start when the price grows', async () => {
    const item = editableItem();
    const { repositories, items } = createHarness([item]);

    await updateWishlistItem(repositories, item, editInput({ priceCents: 179_900 }), {
      scheduleReminder: true,
      finances: FINANCES,
    });

    const stored = items.get('w1');
    expect(stored?.cooldownDays).toBe(30);
    expect(stored?.cooldownStartedAt).toBe(item.cooldownStartedAt);
    // Measured from the original start: the day already spent still counts.
    expect(periodLength(item.cooldownStartedAt, stored?.cooldownEndsAt ?? '')).toBe(30);
  });

  it('honours a period the user picks, also measured from the original start', async () => {
    const item = editableItem({ cooldownStartedAt: isoDaysFromNow(-3) });
    const { repositories, items } = createHarness([item]);

    await updateWishlistItem(repositories, item, editInput({ cooldownDays: 14 }), {
      scheduleReminder: true,
      finances: FINANCES,
    });

    const stored = items.get('w1');
    expect(stored?.cooldownDays).toBe(14);
    // Fourteen days from when the reflection began, so eleven are left — not a fresh fourteen.
    expect(periodLength(item.cooldownStartedAt, stored?.cooldownEndsAt ?? '')).toBe(14);
  });

  it('keeps the user period even when the new price would suggest another', async () => {
    const item = editableItem({ cooldownDays: 14 });
    const { repositories, items } = createHarness([item]);

    await updateWishlistItem(
      repositories,
      item,
      editInput({ priceCents: 179_900, cooldownDays: 14 }),
      { scheduleReminder: true, finances: FINANCES },
    );

    expect(items.get('w1')?.cooldownDays).toBe(14);
    expect(items.get('w1')?.cooldownEndsAt).toBe(item.cooldownEndsAt);
  });

  it('replaces the pending reminder when the period moves', async () => {
    const item = editableItem();
    const { repositories } = createHarness([item]);

    await updateWishlistItem(repositories, item, editInput({ priceCents: 179_900 }), {
      scheduleReminder: true,
      finances: FINANCES,
    });

    expect(cancelCooldownReminder).toHaveBeenCalledWith('w1');
    expect(scheduleCooldownReminder).toHaveBeenCalledTimes(1);
    // Scheduled against the saved item, so it fires at the new end date.
    const scheduled = (scheduleCooldownReminder as jest.Mock).mock.calls[0]?.[0] as WishlistItem;
    expect(scheduled.cooldownEndsAt).not.toBe(item.cooldownEndsAt);
  });

  it('cancels the stale reminder without scheduling one when reminders are off', async () => {
    const item = editableItem();
    const { repositories } = createHarness([item]);

    await updateWishlistItem(repositories, item, editInput({ priceCents: 179_900 }), {
      scheduleReminder: false,
      finances: FINANCES,
    });

    expect(cancelCooldownReminder).toHaveBeenCalledWith('w1');
    expect(scheduleCooldownReminder).not.toHaveBeenCalled();
  });

  it('puts an elapsed item back into reflection when its period grows', async () => {
    // The stored status gates the reminder: an item left as ready to decide
    // could never be reminded about again, however long its new period is.
    const item = editableItem({
      cooldownStartedAt: isoDaysFromNow(-5),
      cooldownEndsAt: isoDaysFromNow(-2),
      status: 'ready_to_decide',
    });
    const { repositories, items } = createHarness([item]);

    await updateWishlistItem(repositories, item, editInput({ priceCents: 179_900 }), {
      scheduleReminder: true,
      finances: FINANCES,
    });

    expect(items.get('w1')?.status).toBe('thinking');
    expect(scheduleCooldownReminder).toHaveBeenCalledTimes(1);
  });

  it('marks the item ready when a shortened period has already elapsed', async () => {
    const item = editableItem({
      priceCents: 179_900,
      cooldownDays: 30,
      cooldownStartedAt: isoDaysFromNow(-5),
      cooldownEndsAt: isoDaysFromNow(25),
    });
    const { repositories, items } = createHarness([item]);

    // The form prefills the stored period, so an untouched chip sends it back unchanged.
    await updateWishlistItem(
      repositories,
      item,
      editInput({ priceCents: 1_000, cooldownDays: 30 }),
      {
        scheduleReminder: true,
        finances: FINANCES,
      },
    );

    expect(items.get('w1')?.cooldownDays).toBe(1);
    expect(items.get('w1')?.status).toBe('ready_to_decide');
  });

  it('deletes the photo it replaced, and keeps one that was not touched', async () => {
    const item = editableItem({ imageUri: 'file:///images/old.jpg' });
    const { repositories } = createHarness([item]);

    await updateWishlistItem(
      repositories,
      item,
      editInput({ imageUri: 'file:///images/new.jpg' }),
      {
        scheduleReminder: true,
        finances: FINANCES,
      },
    );
    expect(deleteItemImage).toHaveBeenCalledWith('file:///images/old.jpg');

    jest.clearAllMocks();
    const untouched = editableItem({ imageUri: 'file:///images/old.jpg' });
    const second = createHarness([untouched]);
    await updateWishlistItem(
      second.repositories,
      untouched,
      editInput({ imageUri: 'file:///images/old.jpg' }),
      { scheduleReminder: true, finances: FINANCES },
    );
    expect(deleteItemImage).not.toHaveBeenCalledWith('file:///images/old.jpg');
  });

  it('refuses to rewrite an item that has already been decided', async () => {
    const item = editableItem({ status: 'purchased', decidedAt: '2026-08-13T09:00:00.000Z' });
    const { repositories } = createHarness([item]);

    await expect(
      updateWishlistItem(repositories, item, editInput({ priceCents: 1_000 }), {
        scheduleReminder: true,
        finances: FINANCES,
      }),
    ).rejects.toThrow(/decided/i);

    expect(repositories.wishlist.update).not.toHaveBeenCalled();
  });
});

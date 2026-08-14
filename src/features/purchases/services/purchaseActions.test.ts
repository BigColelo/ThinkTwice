import { invalidate, resetRevisionsForTesting } from '@/db/dataRevisions';
import type { NewPurchase, Repositories } from '@/db/repositories';
import { deleteItemImage, persistItemImage } from '@/features/images/itemImages';
import type { PurchaseExpense, PurchaseWithStats, UsageEvent } from '@/types/domain';

import {
  addPurchaseExpense,
  createOwnedPurchase,
  deletePurchase,
  recordUse,
  removePurchaseExpense,
  setResaleValue,
  undoLastUse,
} from './purchaseActions';

// The real bus is kept — only the entry point is observed, so the invalidation
// contract each action owes to open screens can be asserted directly.
jest.mock('@/db/dataRevisions', () => {
  const actual = jest.requireActual<typeof import('@/db/dataRevisions')>('@/db/dataRevisions');
  return { ...actual, invalidate: jest.fn(actual.invalidate) };
});

jest.mock('@/features/images/itemImages', () => ({
  deleteItemImage: jest.fn(async () => undefined),
  // The real implementation copies the picked file into app storage and returns
  // the new location; the prefix here makes that substitution visible.
  persistItemImage: jest.fn(async (uri: string | null) => (uri == null ? null : `stored:${uri}`)),
}));

/**
 * Workflow-level tests for the purchase actions, against in-memory repositories.
 *
 * These cover what no single unit owns: that a photo only reaches app storage
 * when the purchase is actually saved, that the hot path stays a single insert,
 * and that every action names the entities it touched — including the one case
 * where it must not.
 */

const invalidateMock = invalidate as jest.MockedFunction<typeof invalidate>;

const OWNED_INPUT: NewPurchase = {
  name: 'Espresso machine',
  purchasePriceCents: 65_000,
  purchaseDate: '2026-08-13',
  categoryId: 'home',
  imageUri: null,
  currentResaleValueCents: null,
};

function basePurchase(overrides: Partial<PurchaseWithStats> = {}): PurchaseWithStats {
  return {
    id: 'p1',
    wishlistItemId: null,
    name: 'Espresso machine',
    purchasePriceCents: 65_000,
    purchaseDate: '2026-08-13',
    categoryId: 'home',
    imageUri: null,
    expectedUsageFrequency: 'daily',
    customUsesPerMonth: null,
    expectedOwnershipMonths: 60,
    currentResaleValueCents: null,
    totalUses: 0,
    additionalExpensesCents: 0,
    lastUsedAt: null,
    createdAt: '2026-08-13T09:00:00.000Z',
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  };
}

type Harness = {
  repositories: Repositories;
  purchases: Map<string, PurchaseWithStats>;
  usage: UsageEvent[];
  expenses: PurchaseExpense[];
};

function createHarness(
  initialPurchases: PurchaseWithStats[] = [],
  /** Only the fields `deletePurchase` reads of an originating wishlist item. */
  initialWishlistItems: { id: string; imageUri: string | null }[] = [],
): Harness {
  const purchases = new Map(initialPurchases.map((purchase) => [purchase.id, purchase]));
  const wishlistItems = new Map(initialWishlistItems.map((item) => [item.id, item]));
  const usage: UsageEvent[] = [];
  const expenses: PurchaseExpense[] = [];
  let nextId = 1;

  // A monotonic clock, so "the use recorded last" is unambiguous without
  // depending on how fast the test runs.
  let millis = Date.parse('2026-08-13T09:00:00.000Z');
  const tick = (): string => new Date((millis += 1_000)).toISOString();

  const repositories = {
    wishlist: {
      findById: jest.fn(async (id: string) => wishlistItems.get(id) ?? null),
    },
    purchases: {
      create: jest.fn(async (draft: Record<string, unknown>) => {
        const purchase = basePurchase({
          id: `p-${nextId++}`,
          ...(draft as Partial<PurchaseWithStats>),
        });
        purchases.set(purchase.id, purchase);
        return purchase;
      }),
      findById: jest.fn(async (id: string) => purchases.get(id) ?? null),
      update: jest.fn(async (id: string, update: Partial<PurchaseWithStats>) => {
        const existing = purchases.get(id);
        if (!existing) return null;
        const next = { ...existing, ...update, updatedAt: tick() };
        purchases.set(id, next);
        return next;
      }),
      setResaleValue: jest.fn(async (id: string, valueCents: number | null) => {
        const existing = purchases.get(id);
        if (!existing) return null;
        const next = { ...existing, currentResaleValueCents: valueCents, updatedAt: tick() };
        purchases.set(id, next);
        return next;
      }),
      remove: jest.fn(async (id: string) => {
        purchases.delete(id);
      }),
    },
    usage: {
      recordUse: jest.fn(async (purchaseId: string) => {
        const now = tick();
        const event: UsageEvent = {
          id: `u-${nextId++}`,
          purchaseId,
          occurredAt: now,
          count: 1,
          createdAt: now,
        };
        usage.push(event);
        return event;
      }),
      // Mirrors the repository's ordering: the use entered last is the one undo removes.
      undoLastUse: jest.fn(async (purchaseId: string) => {
        for (let index = usage.length - 1; index >= 0; index -= 1) {
          const event = usage[index];
          if (event && event.purchaseId === purchaseId) {
            usage.splice(index, 1);
            return event;
          }
        }
        return null;
      }),
      listForPurchase: jest.fn(async (purchaseId: string) =>
        usage.filter((event) => event.purchaseId === purchaseId),
      ),
    },
    expenses: {
      create: jest.fn(async (input: Omit<PurchaseExpense, 'id' | 'date' | 'createdAt'>) => {
        const expense: PurchaseExpense = {
          id: `e-${nextId++}`,
          date: '2026-08-13',
          createdAt: tick(),
          ...input,
        };
        expenses.push(expense);
        return expense;
      }),
      remove: jest.fn(async (id: string) => {
        const index = expenses.findIndex((expense) => expense.id === id);
        if (index >= 0) expenses.splice(index, 1);
      }),
    },
  } as unknown as Repositories;

  return { repositories, purchases, usage, expenses };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetRevisionsForTesting();
});

describe('createOwnedPurchase', () => {
  it('copies the picked photo into app storage only when the purchase is saved', async () => {
    const { repositories } = createHarness();

    const purchase = await createOwnedPurchase(repositories, {
      ...OWNED_INPUT,
      imageUri: 'file:///tmp/picked.jpg',
    });

    expect(persistItemImage).toHaveBeenCalledWith('file:///tmp/picked.jpg');
    // The stored location is what gets written, not the temporary picked one.
    expect(purchase.imageUri).toBe('stored:file:///tmp/picked.jpg');
  });

  it('saves an item without a photo as having none', async () => {
    const { repositories } = createHarness();

    const purchase = await createOwnedPurchase(repositories, OWNED_INPUT);

    expect(purchase.imageUri).toBeNull();
  });

  it('is standalone: an owned item has no wishlist item behind it', async () => {
    const { repositories } = createHarness();

    const purchase = await createOwnedPurchase(repositories, OWNED_INPUT);

    expect(purchase.wishlistItemId).toBeNull();
    expect(purchase.totalUses).toBe(0);
  });

  it('invalidates purchases so the lists re-read', async () => {
    const { repositories } = createHarness();

    await createOwnedPurchase(repositories, OWNED_INPUT);

    expect(invalidateMock).toHaveBeenCalledWith('purchases');
  });
});

describe('recordUse', () => {
  it('adds one use per tap without reading or rewriting the purchase', async () => {
    const { repositories, usage } = createHarness([basePurchase()]);

    await recordUse(repositories, 'p1');
    await recordUse(repositories, 'p1');

    expect(usage).toHaveLength(2);
    // The totals are recomputed by the queries that need them; the app's
    // most-repeated write stays a single insert.
    expect(repositories.purchases.findById).not.toHaveBeenCalled();
    expect(repositories.purchases.update).not.toHaveBeenCalled();
  });

  it('invalidates usage and purchases so totals and cost per use refresh', async () => {
    const { repositories } = createHarness([basePurchase()]);

    await recordUse(repositories, 'p1');

    expect(invalidateMock).toHaveBeenCalledWith('usage', 'purchases');
  });
});

describe('undoLastUse', () => {
  it('removes the use that was recorded last and returns it', async () => {
    const { repositories, usage } = createHarness([basePurchase()]);

    await recordUse(repositories, 'p1');
    const second = await recordUse(repositories, 'p1');

    const removed = await undoLastUse(repositories, 'p1');

    expect(removed?.id).toBe(second.id);
    expect(usage).toHaveLength(1);
  });

  it('leaves the uses of other purchases alone', async () => {
    const { repositories, usage } = createHarness([basePurchase(), basePurchase({ id: 'p2' })]);

    const onFirst = await recordUse(repositories, 'p1');
    await recordUse(repositories, 'p2');

    await undoLastUse(repositories, 'p2');

    expect(usage).toEqual([onFirst]);
  });

  it('does nothing and invalidates nothing when there is no use to undo', async () => {
    const { repositories } = createHarness([basePurchase()]);

    const removed = await undoLastUse(repositories, 'p1');

    expect(removed).toBeNull();
    // Invalidating here would make every open screen re-read for no change.
    expect(invalidateMock).not.toHaveBeenCalled();
  });
});

describe('addPurchaseExpense', () => {
  it('invalidates expenses and purchases, because cost per use includes them', async () => {
    const { repositories, expenses } = createHarness([basePurchase()]);

    await addPurchaseExpense(repositories, {
      purchaseId: 'p1',
      name: 'Descaler',
      amountCents: 1_200,
      expenseType: 'maintenance',
    });

    expect(expenses).toHaveLength(1);
    expect(invalidateMock).toHaveBeenCalledWith('expenses', 'purchases');
  });
});

describe('removePurchaseExpense', () => {
  it('invalidates expenses and purchases', async () => {
    const { repositories, expenses } = createHarness([basePurchase()]);

    const expense = await addPurchaseExpense(repositories, {
      purchaseId: 'p1',
      name: 'Descaler',
      amountCents: 1_200,
      expenseType: 'maintenance',
    });
    invalidateMock.mockClear();

    await removePurchaseExpense(repositories, expense.id);

    expect(expenses).toHaveLength(0);
    expect(invalidateMock).toHaveBeenCalledWith('expenses', 'purchases');
  });
});

describe('setResaleValue', () => {
  it('passes null through to clear the estimate, which is not an estimate of zero', async () => {
    const { repositories, purchases } = createHarness([
      basePurchase({ currentResaleValueCents: 40_000 }),
    ]);

    await setResaleValue(repositories, 'p1', 0);
    expect(purchases.get('p1')?.currentResaleValueCents).toBe(0);

    await setResaleValue(repositories, 'p1', null);
    expect(purchases.get('p1')?.currentResaleValueCents).toBeNull();

    expect(invalidateMock).toHaveBeenCalledWith('purchases');
  });
});

describe('deletePurchase', () => {
  const PHOTO = 'stored:file:///tmp/picked.jpg';

  it('removes the row, its stored photo and everything derived from it', async () => {
    const { repositories, purchases } = createHarness([basePurchase({ imageUri: PHOTO })]);

    await deletePurchase(repositories, { id: 'p1', imageUri: PHOTO, wishlistItemId: null });

    expect(purchases.has('p1')).toBe(false);
    expect(deleteItemImage).toHaveBeenCalledWith(PHOTO);
    // Usage events and expenses go with the row through the schema's cascade,
    // so the queries watching them have to re-read too.
    expect(invalidateMock).toHaveBeenCalledWith('purchases', 'usage', 'expenses');
  });

  it('keeps the photo when the wishlist item it came from still shows it', async () => {
    // Conversion copies the URI, not the file: deleting it here would leave the
    // item this purchase came from displaying a picture that no longer exists.
    const { repositories, purchases } = createHarness(
      [basePurchase({ imageUri: PHOTO, wishlistItemId: 'w1' })],
      [{ id: 'w1', imageUri: PHOTO }],
    );

    await deletePurchase(repositories, { id: 'p1', imageUri: PHOTO, wishlistItemId: 'w1' });

    expect(purchases.has('p1')).toBe(false);
    expect(deleteItemImage).not.toHaveBeenCalledWith(PHOTO);
  });

  it('deletes the photo when the item it came from is already gone', async () => {
    const { repositories } = createHarness([
      basePurchase({ imageUri: PHOTO, wishlistItemId: 'w1' }),
    ]);

    await deletePurchase(repositories, { id: 'p1', imageUri: PHOTO, wishlistItemId: 'w1' });

    expect(deleteItemImage).toHaveBeenCalledWith(PHOTO);
  });

  it('deletes its own photo when the originating item now shows a different one', async () => {
    const { repositories } = createHarness(
      [basePurchase({ imageUri: PHOTO, wishlistItemId: 'w1' })],
      [{ id: 'w1', imageUri: 'stored:file:///tmp/other.jpg' }],
    );

    await deletePurchase(repositories, { id: 'p1', imageUri: PHOTO, wishlistItemId: 'w1' });

    expect(deleteItemImage).toHaveBeenCalledWith(PHOTO);
  });
});

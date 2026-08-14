import type { PurchaseWithStats, RecurringCommitment } from '@/types/domain';

import {
  calculateInsights,
  filterDismissedByRange,
  filterPurchasesByRange,
  type DismissedItem,
  type InsightsInput,
} from './calculations';

const NOW = new Date('2026-08-13T12:00:00');

function purchase(overrides: Partial<PurchaseWithStats> = {}): PurchaseWithStats {
  return {
    id: 'p1',
    wishlistItemId: null,
    name: 'Item',
    purchasePriceCents: 10_000,
    purchaseDate: '2026-03-01',
    categoryId: 'technology',
    imageUri: null,
    expectedUsageFrequency: null,
    customUsesPerMonth: null,
    expectedOwnershipMonths: null,
    currentResaleValueCents: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    totalUses: 0,
    additionalExpensesCents: 0,
    lastUsedAt: null,
    ...overrides,
  };
}

function dismissed(overrides: Partial<DismissedItem> = {}): DismissedItem {
  return { priceCents: 179_900, decidedAt: '2026-03-01T10:00:00.000Z', ...overrides };
}

/** Every field is required, so the defaults live here rather than at each call. */
function input(overrides: Partial<InsightsInput> = {}): InsightsInput {
  return {
    purchases: [],
    commitments: [],
    dismissedItems: [],
    range: 'all_time',
    ...overrides,
  };
}

const commitment: RecurringCommitment = {
  id: 'c1',
  name: 'Rent',
  amountCents: 60_000,
  frequency: 'monthly',
  categoryId: 'housing',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('calculateInsights', () => {
  it('reports an empty state when nothing is tracked', () => {
    const summary = calculateInsights(input(), NOW);

    expect(summary.isEmpty).toBe(true);
    expect(summary.averageCostPerUseCents).toBeNull();
    expect(summary.bestValue).toBeNull();
    expect(summary.highestCostPerUse).toBeNull();
    expect(summary.avoidedPurchaseCount).toBe(0);
    expect(summary.avoidedPurchaseValueCents).toBe(0);
  });

  it('totals purchase value and expenses separately', () => {
    const summary = calculateInsights(
      input({
        purchases: [
          purchase({ id: 'a', purchasePriceCents: 13_000, additionalExpensesCents: 2_000 }),
          purchase({ id: 'b', purchasePriceCents: 249_900, additionalExpensesCents: 21_000 }),
        ],
      }),
      NOW,
    );

    expect(summary.totalTrackedPurchaseValueCents).toBe(262_900);
    expect(summary.totalAdditionalExpensesCents).toBe(23_000);
    expect(summary.purchaseCount).toBe(2);
  });

  it('excludes zero-usage items from the average cost per use', () => {
    const summary = calculateInsights(
      input({
        purchases: [
          purchase({ id: 'a', purchasePriceCents: 10_000, totalUses: 100 }), // 100 c/use
          purchase({ id: 'b', purchasePriceCents: 10_000, totalUses: 50 }), // 200 c/use
          purchase({ id: 'c', purchasePriceCents: 500_000, totalUses: 0 }), // excluded
        ],
      }),
      NOW,
    );

    expect(summary.itemsWithUsage).toBe(2);
    expect(summary.itemsWithoutUsage).toBe(1);
    expect(summary.averageCostPerUseCents).toBeCloseTo(150, 6);
  });

  it('identifies the lowest and highest cost per use', () => {
    const summary = calculateInsights(
      input({
        purchases: [
          purchase({
            id: 'shoes',
            name: 'Running shoes',
            purchasePriceCents: 13_000,
            totalUses: 151,
          }),
          purchase({ id: 'dj', name: 'DJ controller', purchasePriceCents: 44_700, totalUses: 6 }),
        ],
      }),
      NOW,
    );

    expect(summary.bestValue?.name).toBe('Running shoes');
    expect(summary.highestCostPerUse?.name).toBe('DJ controller');
  });

  it('does not label one item as both best and worst', () => {
    const summary = calculateInsights(
      input({ purchases: [purchase({ id: 'only', totalUses: 10 })] }),
      NOW,
    );

    expect(summary.bestValue?.purchaseId).toBe('only');
    expect(summary.highestCostPerUse).toBeNull();
  });

  it('breaks spending down by category, largest first', () => {
    const summary = calculateInsights(
      input({
        purchases: [
          purchase({ id: 'a', categoryId: 'sport', purchasePriceCents: 10_000 }),
          purchase({ id: 'b', categoryId: 'technology', purchasePriceCents: 30_000 }),
          purchase({ id: 'c', categoryId: 'technology', purchasePriceCents: 10_000 }),
        ],
      }),
      NOW,
    );

    expect(summary.spendingByCategory.map((entry) => entry.categoryId)).toEqual([
      'technology',
      'sport',
    ]);
    expect(summary.spendingByCategory[0]?.totalCents).toBe(40_000);
    expect(summary.spendingByCategory[0]?.purchaseCount).toBe(2);
    expect(summary.spendingByCategory[0]?.share).toBeCloseTo(0.8, 6);
  });

  it('includes commitment summaries', () => {
    const summary = calculateInsights(input({ commitments: [commitment] }), NOW);

    expect(summary.monthlyCommitmentsCents).toBe(60_000);
    expect(summary.annualCommitmentsCents).toBe(720_000);
  });

  it('never produces a non-finite share when nothing was spent', () => {
    const summary = calculateInsights(
      input({ purchases: [purchase({ id: 'free', purchasePriceCents: 0 })] }),
      NOW,
    );

    expect(summary.spendingByCategory[0]?.share).toBe(0);
  });
});

describe('calculateInsights, what was decided against', () => {
  it('counts the dismissals and sums what they would have cost', () => {
    const summary = calculateInsights(
      input({
        dismissedItems: [dismissed({ priceCents: 179_900 }), dismissed({ priceCents: 4_500 })],
      }),
      NOW,
    );

    expect(summary.avoidedPurchaseCount).toBe(2);
    expect(summary.avoidedPurchaseValueCents).toBe(184_400);
  });

  it('keeps what was avoided out of what was spent', () => {
    // The two are different facts about different money. Adding a dismissal to
    // spending, or to a category total, would misstate both.
    const summary = calculateInsights(
      input({
        purchases: [purchase({ categoryId: 'sport', purchasePriceCents: 10_000 })],
        dismissedItems: [dismissed({ priceCents: 179_900 })],
      }),
      NOW,
    );

    expect(summary.totalTrackedPurchaseValueCents).toBe(10_000);
    expect(summary.purchaseCount).toBe(1);
    expect(summary.spendingByCategory).toHaveLength(1);
    expect(summary.spendingByCategory[0]?.totalCents).toBe(10_000);
    expect(summary.avoidedPurchaseValueCents).toBe(179_900);
  });

  it('places a dismissal by when it was decided', () => {
    const summary = calculateInsights(
      input({
        range: 'this_year',
        dismissedItems: [
          dismissed({ priceCents: 10_000, decidedAt: '2026-03-01T10:00:00.000Z' }),
          dismissed({ priceCents: 500_000, decidedAt: '2024-12-20T10:00:00.000Z' }),
        ],
      }),
      NOW,
    );

    expect(summary.avoidedPurchaseCount).toBe(1);
    expect(summary.avoidedPurchaseValueCents).toBe(10_000);
  });

  it('clears the empty state when the only records are dismissals', () => {
    // Someone who talks themselves out of everything has used the app exactly as
    // intended; showing them "no insights yet" would report the opposite.
    const summary = calculateInsights(input({ dismissedItems: [dismissed()] }), NOW);

    expect(summary.isEmpty).toBe(false);
    expect(summary.avoidedPurchaseCount).toBe(1);
    expect(summary.purchaseCount).toBe(0);
  });

  it('stays empty when the only dismissal falls outside the range', () => {
    const summary = calculateInsights(
      input({
        range: 'this_year',
        dismissedItems: [dismissed({ decidedAt: '2024-12-20T10:00:00.000Z' })],
      }),
      NOW,
    );

    expect(summary.isEmpty).toBe(true);
  });
});

describe('filterPurchasesByRange', () => {
  const purchases = [
    purchase({ id: 'this-year', purchaseDate: '2026-03-01' }),
    purchase({ id: 'last-year', purchaseDate: '2025-11-01' }),
    purchase({ id: 'old', purchaseDate: '2022-01-01' }),
  ];

  it('returns everything for all time', () => {
    expect(filterPurchasesByRange(purchases, 'all_time', NOW)).toHaveLength(3);
  });

  it('keeps only the current calendar year', () => {
    const result = filterPurchasesByRange(purchases, 'this_year', NOW);
    expect(result.map((item) => item.id)).toEqual(['this-year']);
  });

  it('keeps the trailing twelve months', () => {
    const result = filterPurchasesByRange(purchases, 'last_12_months', NOW);
    expect(result.map((item) => item.id)).toEqual(['this-year', 'last-year']);
  });

  it('keeps a purchase with an unreadable date rather than dropping it silently', () => {
    const result = filterPurchasesByRange(
      [purchase({ id: 'broken', purchaseDate: 'not-a-date' })],
      'this_year',
      NOW,
    );
    expect(result).toHaveLength(1);
  });
});

describe('filterDismissedByRange', () => {
  const items = [
    dismissed({ priceCents: 1, decidedAt: '2026-03-01T10:00:00.000Z' }),
    dismissed({ priceCents: 2, decidedAt: '2025-11-01T10:00:00.000Z' }),
    dismissed({ priceCents: 3, decidedAt: '2022-01-01T10:00:00.000Z' }),
  ];

  it('returns everything for all time', () => {
    expect(filterDismissedByRange(items, 'all_time', NOW)).toHaveLength(3);
  });

  it('keeps only the current calendar year', () => {
    const result = filterDismissedByRange(items, 'this_year', NOW);
    expect(result.map((item) => item.priceCents)).toEqual([1]);
  });

  it('keeps the trailing twelve months', () => {
    const result = filterDismissedByRange(items, 'last_12_months', NOW);
    expect(result.map((item) => item.priceCents)).toEqual([1, 2]);
  });

  it('keeps a decision with no readable timestamp rather than understating the count', () => {
    expect(filterDismissedByRange([dismissed({ decidedAt: null })], 'this_year', NOW)).toHaveLength(
      1,
    );
    expect(
      filterDismissedByRange([dismissed({ decidedAt: 'not-a-date' })], 'this_year', NOW),
    ).toHaveLength(1);
  });
});

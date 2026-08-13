import type { PurchaseWithStats, RecurringCommitment } from '@/types/domain';

import { calculateInsights, filterPurchasesByRange } from './calculations';

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
    const summary = calculateInsights({ purchases: [], commitments: [], range: 'all_time' }, NOW);

    expect(summary.isEmpty).toBe(true);
    expect(summary.averageCostPerUseCents).toBeNull();
    expect(summary.bestValue).toBeNull();
    expect(summary.highestCostPerUse).toBeNull();
  });

  it('totals purchase value and expenses separately', () => {
    const summary = calculateInsights(
      {
        purchases: [
          purchase({ id: 'a', purchasePriceCents: 13_000, additionalExpensesCents: 2_000 }),
          purchase({ id: 'b', purchasePriceCents: 249_900, additionalExpensesCents: 21_000 }),
        ],
        commitments: [],
        range: 'all_time',
      },
      NOW,
    );

    expect(summary.totalTrackedPurchaseValueCents).toBe(262_900);
    expect(summary.totalAdditionalExpensesCents).toBe(23_000);
    expect(summary.purchaseCount).toBe(2);
  });

  it('excludes zero-usage items from the average cost per use', () => {
    const summary = calculateInsights(
      {
        purchases: [
          purchase({ id: 'a', purchasePriceCents: 10_000, totalUses: 100 }), // 100 c/use
          purchase({ id: 'b', purchasePriceCents: 10_000, totalUses: 50 }), // 200 c/use
          purchase({ id: 'c', purchasePriceCents: 500_000, totalUses: 0 }), // excluded
        ],
        commitments: [],
        range: 'all_time',
      },
      NOW,
    );

    expect(summary.itemsWithUsage).toBe(2);
    expect(summary.itemsWithoutUsage).toBe(1);
    expect(summary.averageCostPerUseCents).toBeCloseTo(150, 6);
  });

  it('identifies the lowest and highest cost per use', () => {
    const summary = calculateInsights(
      {
        purchases: [
          purchase({
            id: 'shoes',
            name: 'Running shoes',
            purchasePriceCents: 13_000,
            totalUses: 151,
          }),
          purchase({ id: 'dj', name: 'DJ controller', purchasePriceCents: 44_700, totalUses: 6 }),
        ],
        commitments: [],
        range: 'all_time',
      },
      NOW,
    );

    expect(summary.bestValue?.name).toBe('Running shoes');
    expect(summary.highestCostPerUse?.name).toBe('DJ controller');
  });

  it('does not label one item as both best and worst', () => {
    const summary = calculateInsights(
      {
        purchases: [purchase({ id: 'only', totalUses: 10 })],
        commitments: [],
        range: 'all_time',
      },
      NOW,
    );

    expect(summary.bestValue?.purchaseId).toBe('only');
    expect(summary.highestCostPerUse).toBeNull();
  });

  it('breaks spending down by category, largest first', () => {
    const summary = calculateInsights(
      {
        purchases: [
          purchase({ id: 'a', categoryId: 'sport', purchasePriceCents: 10_000 }),
          purchase({ id: 'b', categoryId: 'technology', purchasePriceCents: 30_000 }),
          purchase({ id: 'c', categoryId: 'technology', purchasePriceCents: 10_000 }),
        ],
        commitments: [],
        range: 'all_time',
      },
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
    const summary = calculateInsights(
      { purchases: [], commitments: [commitment], range: 'all_time' },
      NOW,
    );

    expect(summary.monthlyCommitmentsCents).toBe(60_000);
    expect(summary.annualCommitmentsCents).toBe(720_000);
  });

  it('never produces a non-finite share when nothing was spent', () => {
    const summary = calculateInsights(
      {
        purchases: [purchase({ id: 'free', purchasePriceCents: 0 })],
        commitments: [],
        range: 'all_time',
      },
      NOW,
    );

    expect(summary.spendingByCategory[0]?.share).toBe(0);
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

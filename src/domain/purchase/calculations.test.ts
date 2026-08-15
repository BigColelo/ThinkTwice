import type { PurchaseExpense, PurchaseWithStats } from '@/types/domain';

import {
  calculateAdditionalExpenses,
  calculateCurrentOwnershipCost,
  calculateOwnershipDuration,
  calculatePurchaseMetrics,
  calculateRealCostPerUse,
} from './calculations';

function purchase(overrides: Partial<PurchaseWithStats> = {}): PurchaseWithStats {
  return {
    id: 'p1',
    wishlistItemId: null,
    name: 'Camera',
    purchasePriceCents: 179_900,
    purchaseDate: '2025-12-13',
    categoryId: 'photography',
    imageUri: null,
    expectedUsageFrequency: null,
    customUsesPerMonth: null,
    expectedOwnershipMonths: null,
    currentResaleValueCents: null,
    createdAt: '2025-12-13T00:00:00.000Z',
    updatedAt: '2025-12-13T00:00:00.000Z',
    totalUses: 0,
    additionalExpensesCents: 0,
    lastUsedAt: null,
    ...overrides,
  };
}

describe('calculateCurrentOwnershipCost', () => {
  it('reproduces the worked example from the product spec', () => {
    // €1,799 + €210 accessories + €0 maintenance − €950 resale = €1,059.
    const result = calculateCurrentOwnershipCost({
      purchasePriceCents: 179_900,
      additionalExpensesCents: 21_000,
      currentResaleValueCents: 95_000,
    });

    expect(result.currentOwnershipCostCents).toBe(105_900);
    expect(result.hasResaleEstimate).toBe(true);
    expect(result.isNetPositive).toBe(false);
  });

  it('treats a missing resale estimate as zero, but records that it is missing', () => {
    const result = calculateCurrentOwnershipCost({
      purchasePriceCents: 100_000,
      additionalExpensesCents: 0,
      currentResaleValueCents: null,
    });

    expect(result.resaleValueCents).toBe(0);
    expect(result.hasResaleEstimate).toBe(false);
    expect(result.currentOwnershipCostCents).toBe(100_000);
  });

  it('handles a resale value above what was spent', () => {
    const result = calculateCurrentOwnershipCost({
      purchasePriceCents: 100_000,
      additionalExpensesCents: 5_000,
      currentResaleValueCents: 130_000,
    });

    expect(result.currentOwnershipCostCents).toBe(-25_000);
    expect(result.isNetPositive).toBe(true);
  });

  it('coerces non-finite stored values to zero', () => {
    const result = calculateCurrentOwnershipCost({
      purchasePriceCents: Number.NaN,
      additionalExpensesCents: Number.POSITIVE_INFINITY,
      currentResaleValueCents: null,
    });

    expect(result.currentOwnershipCostCents).toBe(0);
  });
});

describe('calculateRealCostPerUse', () => {
  it('reproduces the worked example from the product spec', () => {
    // €1,059 over 58 uses → €18.26.
    const result = calculateRealCostPerUse(105_900, 58);
    expect(result).not.toBeNull();
    expect(Math.round(result as number)).toBe(1_826);
  });

  it('returns null rather than dividing by zero', () => {
    expect(calculateRealCostPerUse(105_900, 0)).toBeNull();
    expect(calculateRealCostPerUse(105_900, -1)).toBeNull();
    expect(calculateRealCostPerUse(105_900, Number.NaN)).toBeNull();
  });
});

describe('calculateAdditionalExpenses', () => {
  const expense = (amountCents: number): PurchaseExpense => ({
    id: `e-${amountCents}`,
    purchaseId: 'p1',
    name: 'Accessory',
    amountCents,
    expenseType: 'accessory',
    date: '2026-01-01',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  it('sums every expense', () => {
    expect(calculateAdditionalExpenses([expense(21_000), expense(9_000)])).toBe(30_000);
  });

  it('returns zero for no expenses', () => {
    expect(calculateAdditionalExpenses([])).toBe(0);
  });
});

describe('calculateOwnershipDuration', () => {
  it('reports whole months of ownership', () => {
    const duration = calculateOwnershipDuration('2025-12-13', new Date('2026-08-13T12:00:00'));
    expect(duration?.months).toBe(8);
  });

  it('describes a young purchase in days rather than whole months', () => {
    const duration = calculateOwnershipDuration('2026-08-10', new Date('2026-08-13T12:00:00'));
    expect(duration?.months).toBe(0);
    expect(duration?.days).toBe(3);
  });

  it('reports both parts of a duration spanning years', () => {
    const duration = calculateOwnershipDuration('2024-05-13', new Date('2026-08-13T12:00:00'));
    expect(duration?.months).toBe(27);
  });

  it('never reports negative ownership for a future date', () => {
    const duration = calculateOwnershipDuration('2027-01-01', new Date('2026-08-13T12:00:00'));
    expect(duration?.days).toBe(0);
    expect(duration?.months).toBe(0);
  });

  it('returns null for an unreadable date', () => {
    expect(calculateOwnershipDuration('not-a-date')).toBeNull();
  });
});

describe('calculatePurchaseMetrics', () => {
  const now = new Date('2026-08-13T12:00:00');

  it('assembles the figures the detail screen shows', () => {
    const metrics = calculatePurchaseMetrics(
      purchase({ totalUses: 58, additionalExpensesCents: 21_000, currentResaleValueCents: 95_000 }),
      now,
    );

    expect(metrics.totalUses).toBe(58);
    expect(metrics.ownership.currentOwnershipCostCents).toBe(105_900);
    expect(Math.round(metrics.realCostPerUseCents as number)).toBe(1_826);
    expect(Math.round(metrics.costPerUseFromPriceCents as number)).toBe(3_102);
    expect(metrics.duration?.months).toBe(8);
    expect(metrics.usesPerMonth).toBeCloseTo(58 / 8, 6);
  });

  it('reports no cost per use for an item with no recorded uses', () => {
    const metrics = calculatePurchaseMetrics(purchase({ totalUses: 0 }), now);

    expect(metrics.realCostPerUseCents).toBeNull();
    expect(metrics.costPerUseFromPriceCents).toBeNull();
  });

  it('reports no monthly rate for an item bought this month', () => {
    const metrics = calculatePurchaseMetrics(
      purchase({ purchaseDate: '2026-08-01', totalUses: 4 }),
      now,
    );

    expect(metrics.usesPerMonth).toBeNull();
  });

  it('never produces a non-finite figure from corrupt data', () => {
    const metrics = calculatePurchaseMetrics(
      purchase({ totalUses: Number.NaN, purchasePriceCents: Number.NaN }),
      now,
    );

    expect(metrics.totalUses).toBe(0);
    expect(metrics.realCostPerUseCents).toBeNull();
  });
});

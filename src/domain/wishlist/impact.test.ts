import type { MonthlyFinances } from '@/domain/money/calculations';

import { calculatePurchaseImpact, classifyImpact } from './impact';

function finances(overrides: Partial<MonthlyFinances> = {}): MonthlyFinances {
  return {
    netIncomeCents: 165_000,
    commitmentsCents: 78_300,
    savingsTargetCents: null,
    availableAfterCommitmentsCents: 86_700,
    availableAfterSavingsGoalCents: null,
    availableToIncomeRatio: 86_700 / 165_000,
    commitmentsToIncomeRatio: 78_300 / 165_000,
    isIncomeConfigured: true,
    commitmentsExceedIncome: false,
    ...overrides,
  };
}

describe('calculatePurchaseImpact', () => {
  it('reproduces the worked example from the product spec', () => {
    // €1,799 against €1,650 income and €867 available.
    const impact = calculatePurchaseImpact(179_900, finances());

    expect(Math.round((impact.incomeRatio ?? 0) * 100)).toBe(109);
    expect(Math.round((impact.availableRatio ?? 0) * 100)).toBe(207);
    expect(impact.monthsOfAvailableMoney).toBeCloseTo(2.07, 2);
    expect(impact.level).toBe('high');
    expect(impact.unavailableReason).toBeNull();
  });

  it('reports every figure as unavailable when no income is configured', () => {
    const impact = calculatePurchaseImpact(
      179_900,
      finances({ isIncomeConfigured: false, netIncomeCents: 0 }),
    );

    expect(impact.incomeRatio).toBeNull();
    expect(impact.availableRatio).toBeNull();
    expect(impact.monthsOfAvailableMoney).toBeNull();
    expect(impact.level).toBe('unknown');
    expect(impact.unavailableReason).toBe('no_income');
  });

  it('keeps the income percentage when commitments consume all income', () => {
    const impact = calculatePurchaseImpact(
      50_000,
      finances({ commitmentsCents: 165_000, availableAfterCommitmentsCents: 0 }),
    );

    expect(impact.incomeRatio).toBeCloseTo(50_000 / 165_000, 10);
    expect(impact.availableRatio).toBeNull();
    expect(impact.monthsOfAvailableMoney).toBeNull();
    expect(impact.unavailableReason).toBe('no_available_money');
  });

  it('treats a negative available amount as no available money', () => {
    const impact = calculatePurchaseImpact(
      50_000,
      finances({ commitmentsCents: 200_000, availableAfterCommitmentsCents: -35_000 }),
    );

    expect(impact.availableRatio).toBeNull();
    expect(impact.unavailableReason).toBe('no_available_money');
  });

  it('never produces Infinity or NaN', () => {
    const impact = calculatePurchaseImpact(
      Number.NaN,
      finances({ availableAfterCommitmentsCents: 0, netIncomeCents: 0, isIncomeConfigured: false }),
    );

    for (const value of [
      impact.incomeRatio,
      impact.availableRatio,
      impact.monthsOfAvailableMoney,
    ]) {
      expect(value === null || Number.isFinite(value)).toBe(true);
    }
  });

  it('treats a free item as having no impact', () => {
    const impact = calculatePurchaseImpact(0, finances());
    expect(impact.availableRatio).toBe(0);
    expect(impact.level).toBe('low');
  });
});

describe('classifyImpact', () => {
  it('applies the documented thresholds at their boundaries', () => {
    expect(classifyImpact(0.25)).toBe('low');
    expect(classifyImpact(0.2500001)).toBe('moderate');
    expect(classifyImpact(1)).toBe('moderate');
    expect(classifyImpact(1.0000001)).toBe('high');
  });

  it('returns unknown for a missing or non-finite ratio', () => {
    expect(classifyImpact(null)).toBe('unknown');
    expect(classifyImpact(Number.NaN)).toBe('unknown');
    expect(classifyImpact(Number.POSITIVE_INFINITY)).toBe('unknown');
  });
});

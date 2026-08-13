import { WEEKS_PER_MONTH } from '@/constants/usagePresets';

import { calculateEstimatedCostPerUse, calculateEstimatedUses, resolveUsesPerMonth } from './usage';

describe('resolveUsesPerMonth', () => {
  it('resolves a range preset to its documented midpoint', () => {
    // "2–3 times per week" is defined as 2.5/week.
    expect(
      resolveUsesPerMonth({
        frequency: 'several_times_week',
        customUsesPerMonth: null,
        expectedOwnershipMonths: null,
      }),
    ).toBeCloseTo(2.5 * WEEKS_PER_MONTH, 10);
  });

  it('resolves daily usage using the same week length', () => {
    expect(
      resolveUsesPerMonth({
        frequency: 'daily',
        customUsesPerMonth: null,
        expectedOwnershipMonths: null,
      }),
    ).toBeCloseTo(7 * WEEKS_PER_MONTH, 10);
  });

  it('uses the supplied rate for a custom frequency', () => {
    expect(
      resolveUsesPerMonth({
        frequency: 'custom',
        customUsesPerMonth: 12,
        expectedOwnershipMonths: null,
      }),
    ).toBe(12);
  });

  it('returns null for a custom frequency with no rate', () => {
    expect(
      resolveUsesPerMonth({
        frequency: 'custom',
        customUsesPerMonth: null,
        expectedOwnershipMonths: null,
      }),
    ).toBeNull();
  });

  it('rejects a non-positive custom rate', () => {
    expect(
      resolveUsesPerMonth({
        frequency: 'custom',
        customUsesPerMonth: 0,
        expectedOwnershipMonths: null,
      }),
    ).toBeNull();
  });

  it('returns null when no frequency has been chosen', () => {
    expect(
      resolveUsesPerMonth({
        frequency: null,
        customUsesPerMonth: null,
        expectedOwnershipMonths: null,
      }),
    ).toBeNull();
  });
});

describe('calculateEstimatedUses', () => {
  it('reproduces the worked example from the product spec', () => {
    // 2–3 times per week for 5 years → 650 uses.
    expect(
      calculateEstimatedUses({
        frequency: 'several_times_week',
        customUsesPerMonth: null,
        expectedOwnershipMonths: 60,
      }),
    ).toBe(650);
  });

  it('returns null without an ownership duration', () => {
    expect(
      calculateEstimatedUses({
        frequency: 'weekly',
        customUsesPerMonth: null,
        expectedOwnershipMonths: null,
      }),
    ).toBeNull();
  });

  it('returns null for a non-positive ownership duration', () => {
    expect(
      calculateEstimatedUses({
        frequency: 'weekly',
        customUsesPerMonth: null,
        expectedOwnershipMonths: 0,
      }),
    ).toBeNull();
  });

  it('rounds to a whole number of uses', () => {
    const result = calculateEstimatedUses({
      frequency: 'occasionally',
      customUsesPerMonth: null,
      expectedOwnershipMonths: 7,
    });
    // 4 uses/year over 7 months → 2.33 → 2.
    expect(result).toBe(2);
  });

  it('returns null rather than zero when the estimate rounds away', () => {
    expect(
      calculateEstimatedUses({
        frequency: 'occasionally',
        customUsesPerMonth: null,
        expectedOwnershipMonths: 1,
      }),
    ).toBeNull();
  });
});

describe('calculateEstimatedCostPerUse', () => {
  it('reproduces the worked example from the product spec', () => {
    // €1,799 over 650 uses → €2.77.
    const result = calculateEstimatedCostPerUse(179_900, 650);
    expect(result).not.toBeNull();
    expect(Math.round(result as number)).toBe(277);
  });

  it('returns null when there are no estimated uses', () => {
    expect(calculateEstimatedCostPerUse(179_900, null)).toBeNull();
    expect(calculateEstimatedCostPerUse(179_900, 0)).toBeNull();
  });

  it('returns zero for a free item rather than null', () => {
    expect(calculateEstimatedCostPerUse(0, 10)).toBe(0);
  });

  it('rejects a negative price', () => {
    expect(calculateEstimatedCostPerUse(-100, 10)).toBeNull();
  });

  it('never returns a non-finite value', () => {
    const result = calculateEstimatedCostPerUse(Number.POSITIVE_INFINITY, 10);
    expect(result).toBeNull();
  });
});

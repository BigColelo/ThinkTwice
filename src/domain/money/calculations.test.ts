import type { RecurringCommitment } from '@/types/domain';

import { calculateAvailableAfterCommitments, calculateMonthlyFinances } from './calculations';

function commitment(
  amountCents: number,
  overrides: Partial<RecurringCommitment> = {},
): RecurringCommitment {
  return {
    id: `c-${amountCents}`,
    name: 'Commitment',
    amountCents,
    frequency: 'monthly',
    categoryId: 'other',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('calculateMonthlyFinances', () => {
  it('subtracts commitments from income', () => {
    // The worked example from the product spec: €1,650 − €783 = €867.
    const result = calculateMonthlyFinances({
      monthlyNetIncomeCents: 165_000,
      monthlySavingsTargetCents: null,
      commitments: [
        commitment(60_000),
        commitment(12_000),
        commitment(1_799),
        commitment(1_000),
        commitment(3_500),
      ],
    });

    expect(result.commitmentsCents).toBe(78_299);
    expect(result.availableAfterCommitmentsCents).toBe(86_701);
    expect(result.isIncomeConfigured).toBe(true);
    expect(result.commitmentsExceedIncome).toBe(false);
  });

  it('keeps the savings target separate from commitments', () => {
    const result = calculateMonthlyFinances({
      monthlyNetIncomeCents: 165_000,
      monthlySavingsTargetCents: 30_000,
      commitments: [commitment(78_300)],
    });

    expect(result.availableAfterCommitmentsCents).toBe(86_700);
    expect(result.availableAfterSavingsGoalCents).toBe(56_700);
  });

  it('reports no savings figure when no target is set', () => {
    const result = calculateMonthlyFinances({
      monthlyNetIncomeCents: 100_000,
      monthlySavingsTargetCents: null,
      commitments: [],
    });

    expect(result.availableAfterSavingsGoalCents).toBeNull();
  });

  it('marks income as unconfigured when it is zero', () => {
    const result = calculateMonthlyFinances({
      monthlyNetIncomeCents: 0,
      monthlySavingsTargetCents: null,
      commitments: [commitment(50_000)],
    });

    expect(result.isIncomeConfigured).toBe(false);
    expect(result.availableToIncomeRatio).toBeNull();
    expect(result.commitmentsToIncomeRatio).toBeNull();
    // The subtraction is still performed and simply comes out negative.
    expect(result.availableAfterCommitmentsCents).toBe(-50_000);
  });

  it('handles commitments larger than income without failing', () => {
    const result = calculateMonthlyFinances({
      monthlyNetIncomeCents: 100_000,
      monthlySavingsTargetCents: null,
      commitments: [commitment(120_000)],
    });

    expect(result.commitmentsExceedIncome).toBe(true);
    expect(result.availableAfterCommitmentsCents).toBe(-20_000);
    expect(result.availableToIncomeRatio).toBeCloseTo(-0.2, 10);
  });

  it('computes the ratios used by the summary ring', () => {
    const result = calculateMonthlyFinances({
      monthlyNetIncomeCents: 165_000,
      monthlySavingsTargetCents: null,
      commitments: [commitment(78_300)],
    });

    expect(result.availableToIncomeRatio).toBeCloseTo(86_700 / 165_000, 10);
    expect(result.commitmentsToIncomeRatio).toBeCloseTo(78_300 / 165_000, 10);
    // Rendered by the summary ring as "53%".
    expect(Math.round((result.availableToIncomeRatio ?? 0) * 100)).toBe(53);
  });

  it('treats a non-finite stored income as zero', () => {
    const result = calculateMonthlyFinances({
      monthlyNetIncomeCents: Number.NaN,
      monthlySavingsTargetCents: null,
      commitments: [],
    });

    expect(result.netIncomeCents).toBe(0);
    expect(result.availableAfterCommitmentsCents).toBe(0);
    expect(result.isIncomeConfigured).toBe(false);
  });

  it('ignores inactive commitments', () => {
    const result = calculateMonthlyFinances({
      monthlyNetIncomeCents: 100_000,
      monthlySavingsTargetCents: null,
      commitments: [commitment(20_000), commitment(30_000, { isActive: false })],
    });

    expect(result.availableAfterCommitmentsCents).toBe(80_000);
  });
});

describe('calculateAvailableAfterCommitments', () => {
  it('matches the full calculation', () => {
    const commitments = [commitment(60_000), commitment(20_000)];
    expect(calculateAvailableAfterCommitments(165_000, commitments)).toBe(85_000);
  });
});

import type { RecurringCommitment } from '@/types/domain';

import {
  calculateAnnualCommitmentEquivalent,
  calculateMonthlyCommitmentEquivalent,
  calculateTotalAnnualCommitments,
  calculateTotalMonthlyCommitments,
} from './calculations';

function commitment(overrides: Partial<RecurringCommitment> = {}): RecurringCommitment {
  return {
    id: 'c1',
    name: 'Rent',
    amountCents: 60_000,
    frequency: 'monthly',
    categoryId: 'housing',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('calculateMonthlyCommitmentEquivalent', () => {
  it('leaves a monthly commitment unchanged', () => {
    expect(
      calculateMonthlyCommitmentEquivalent({ amountCents: 60_000, frequency: 'monthly' }),
    ).toBe(60_000);
  });

  it('spreads a quarterly commitment over three months', () => {
    expect(
      calculateMonthlyCommitmentEquivalent({ amountCents: 30_000, frequency: 'quarterly' }),
    ).toBe(10_000);
  });

  it('spreads an annual commitment over twelve months', () => {
    expect(calculateMonthlyCommitmentEquivalent({ amountCents: 60_000, frequency: 'annual' })).toBe(
      5_000,
    );
  });

  it('spreads a two-monthly commitment over two months', () => {
    expect(
      calculateMonthlyCommitmentEquivalent({ amountCents: 10_000, frequency: 'every_two_months' }),
    ).toBe(5_000);
  });

  it('spreads a semiannual commitment over six months', () => {
    expect(
      calculateMonthlyCommitmentEquivalent({ amountCents: 12_000, frequency: 'semiannual' }),
    ).toBe(2_000);
  });

  it('returns whole cents when the division is not exact', () => {
    // €100/year → €8.333…/month → 833 cents.
    const result = calculateMonthlyCommitmentEquivalent({
      amountCents: 10_000,
      frequency: 'annual',
    });
    expect(result).toBe(833);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('treats a non-finite stored amount as zero rather than propagating NaN', () => {
    expect(
      calculateMonthlyCommitmentEquivalent({ amountCents: Number.NaN, frequency: 'monthly' }),
    ).toBe(0);
  });
});

describe('calculateAnnualCommitmentEquivalent', () => {
  it('multiplies a monthly commitment by twelve', () => {
    expect(calculateAnnualCommitmentEquivalent({ amountCents: 1_799, frequency: 'monthly' })).toBe(
      21_588,
    );
  });

  it('leaves an annual commitment unchanged', () => {
    expect(calculateAnnualCommitmentEquivalent({ amountCents: 24_000, frequency: 'annual' })).toBe(
      24_000,
    );
  });
});

describe('calculateTotalMonthlyCommitments', () => {
  it('sums the monthly equivalents of active commitments', () => {
    const total = calculateTotalMonthlyCommitments([
      commitment({ id: '1', amountCents: 60_000, frequency: 'monthly' }),
      commitment({ id: '2', amountCents: 12_000, frequency: 'monthly' }),
      commitment({ id: '3', amountCents: 1_799, frequency: 'monthly' }),
      commitment({ id: '4', amountCents: 1_000, frequency: 'monthly' }),
      commitment({ id: '5', amountCents: 3_500, frequency: 'monthly' }),
    ]);
    expect(total).toBe(78_299);
  });

  it('excludes inactive commitments', () => {
    const total = calculateTotalMonthlyCommitments([
      commitment({ id: '1', amountCents: 60_000 }),
      commitment({ id: '2', amountCents: 12_000, isActive: false }),
    ]);
    expect(total).toBe(60_000);
  });

  it('returns zero for an empty list', () => {
    expect(calculateTotalMonthlyCommitments([])).toBe(0);
  });

  it('mixes billing frequencies correctly', () => {
    const total = calculateTotalMonthlyCommitments([
      commitment({ id: '1', amountCents: 60_000, frequency: 'monthly' }),
      commitment({ id: '2', amountCents: 24_000, frequency: 'annual' }),
      commitment({ id: '3', amountCents: 30_000, frequency: 'quarterly' }),
    ]);
    expect(total).toBe(60_000 + 2_000 + 10_000);
  });
});

describe('calculateTotalAnnualCommitments', () => {
  it('is always exactly twelve times the monthly total', () => {
    const commitments = [
      commitment({ id: '1', amountCents: 60_000, frequency: 'monthly' }),
      commitment({ id: '2', amountCents: 10_000, frequency: 'annual' }),
    ];
    expect(calculateTotalAnnualCommitments(commitments)).toBe(
      calculateTotalMonthlyCommitments(commitments) * 12,
    );
  });
});

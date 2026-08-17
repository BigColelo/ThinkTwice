import { screen } from '@testing-library/react-native';

import { calculatePurchaseMetrics } from '@/domain';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { PurchaseExpense, PurchaseWithStats } from '@/types/domain';

import { RealCostBreakdown } from './RealCostBreakdown';

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
    currentResaleValueCents: 95_000,
    createdAt: '2025-12-13T00:00:00.000Z',
    updatedAt: '2025-12-13T00:00:00.000Z',
    totalUses: 58,
    additionalExpensesCents: 21_000,
    lastUsedAt: null,
    ...overrides,
  };
}

const accessories: PurchaseExpense = {
  id: 'e1',
  purchaseId: 'p1',
  name: 'Extra lens',
  amountCents: 21_000,
  expenseType: 'accessory',
  date: '2026-01-05',
  createdAt: '2026-01-05T00:00:00.000Z',
};

describe('RealCostBreakdown', () => {
  it('shows the subtraction from the product spec', async () => {
    await renderWithProviders(
      <RealCostBreakdown
        metrics={calculatePurchaseMetrics(purchase(), new Date('2026-08-13T12:00:00'))}
        expenses={[accessories]}
      />,
    );

    expect(screen.getByText('EUR 1,799')).toBeTruthy(); // purchase price
    expect(screen.getByText('+EUR 210')).toBeTruthy(); // accessories
    expect(screen.getByText('-EUR 950')).toBeTruthy(); // resale value
    expect(screen.getByText('EUR 1,059')).toBeTruthy(); // current real cost
    expect(screen.getByText('EUR 18.26')).toBeTruthy(); // real cost per use
  });

  it('says there is no usage data instead of dividing by zero', async () => {
    await renderWithProviders(
      <RealCostBreakdown
        metrics={calculatePurchaseMetrics(
          purchase({ totalUses: 0 }),
          new Date('2026-08-13T12:00:00'),
        )}
        expenses={[accessories]}
      />,
    );

    expect(screen.getByText('No usage data yet')).toBeTruthy();
    expect(screen.queryByText(/NaN|Infinity/)).toBeNull();
  });

  it('marks a resale value as not set rather than showing zero', async () => {
    await renderWithProviders(
      <RealCostBreakdown
        metrics={calculatePurchaseMetrics(
          purchase({ currentResaleValueCents: null, additionalExpensesCents: 0 }),
          new Date('2026-08-13T12:00:00'),
        )}
        expenses={[]}
      />,
    );

    expect(screen.getByText('Not set')).toBeTruthy();
  });

  it('explains a resale value above what was spent', async () => {
    await renderWithProviders(
      <RealCostBreakdown
        metrics={calculatePurchaseMetrics(
          purchase({ currentResaleValueCents: 250_000 }),
          new Date('2026-08-13T12:00:00'),
        )}
        expenses={[accessories]}
      />,
    );

    expect(screen.getByText(/higher than what you have spent/)).toBeTruthy();
  });
});

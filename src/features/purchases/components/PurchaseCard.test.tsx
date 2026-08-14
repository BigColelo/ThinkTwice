import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { PurchaseWithStats } from '@/types/domain';

import { PurchaseCard } from './PurchaseCard';

/**
 * A row in the purchases list.
 *
 * The list can be ordered by price and by date, so both have to be on the row —
 * ranking items by figures the row never shows would leave the order looking
 * arbitrary. Cost per use stays the headline, and says so in words when there is
 * no usage to divide by rather than showing a zero.
 */

function purchase(overrides: Partial<PurchaseWithStats> = {}): PurchaseWithStats {
  return {
    id: 'p1',
    wishlistItemId: null,
    name: 'Espresso machine',
    purchasePriceCents: 65_000,
    purchaseDate: '2026-08-13',
    categoryId: 'home',
    imageUri: null,
    expectedUsageFrequency: null,
    customUsesPerMonth: null,
    expectedOwnershipMonths: null,
    currentResaleValueCents: null,
    createdAt: '2026-08-13T09:00:00.000Z',
    updatedAt: '2026-08-13T09:00:00.000Z',
    totalUses: 0,
    additionalExpensesCents: 0,
    lastUsedAt: null,
    ...overrides,
  };
}

describe('PurchaseCard', () => {
  it('shows every figure the list can be ordered by', async () => {
    await renderWithProviders(
      <PurchaseCard purchase={purchase({ totalUses: 1_820 })} onPress={jest.fn()} />,
    );

    expect(screen.getByText('Espresso machine')).toBeTruthy();
    expect(screen.getByText('1,820 uses · Home')).toBeTruthy();
    expect(screen.getByText('€650')).toBeTruthy();
    expect(screen.getByText('· 13 Aug 2026')).toBeTruthy();
    // €650 over 1,820 uses, to the cent.
    expect(screen.getByText('€0.36 / use')).toBeTruthy();
  });

  it('says there is no usage rather than showing a cost per use of zero', async () => {
    await renderWithProviders(<PurchaseCard purchase={purchase()} onPress={jest.fn()} />);

    expect(screen.getByText('No uses recorded · Home')).toBeTruthy();
    expect(screen.getByText('No usage yet')).toBeTruthy();
    expect(screen.queryByText('€0.00 / use')).toBeNull();
  });

  it('counts additional expenses in the cost per use', async () => {
    // The figure is about what the item has really cost, not its price tag.
    await renderWithProviders(
      <PurchaseCard
        purchase={purchase({ totalUses: 100, additionalExpensesCents: 5_000 })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('€7.00 / use')).toBeTruthy();
  });

  it('is one element for assistive technology, named by what it is', async () => {
    await renderWithProviders(
      <PurchaseCard purchase={purchase({ totalUses: 12 })} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText('Espresso machine, Home, 12 uses')).toBeTruthy();
  });

  it('truncates a long name to one line rather than pushing the figures out', async () => {
    // 80 characters is the longest name the form accepts.
    const longName = 'A'.repeat(80);
    await renderWithProviders(
      <PurchaseCard purchase={purchase({ name: longName, totalUses: 12 })} onPress={jest.fn()} />,
    );

    expect(screen.getByText(longName).props.numberOfLines).toBe(1);
    expect(screen.getByText('€650')).toBeTruthy();
    expect(screen.getByText('€54.17 / use')).toBeTruthy();
  });
});

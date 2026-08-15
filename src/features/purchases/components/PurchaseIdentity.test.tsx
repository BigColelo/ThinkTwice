import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Purchase } from '@/types/domain';

import { PurchaseIdentity } from './PurchaseIdentity';

/**
 * What the item is, at the top of its screen. Two of the three lines are computed
 * elsewhere and only rendered here, so what is asserted is the wording — and that
 * a duration the app could not work out simply does not appear.
 */

function purchase(overrides: Partial<Purchase> = {}): Purchase {
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
    ...overrides,
  };
}

describe('PurchaseIdentity', () => {
  it('names the item, its category and how long it has been owned', async () => {
    await renderWithProviders(<PurchaseIdentity purchase={purchase()} ownedFor="8 months" />);

    expect(screen.getByText('Espresso machine')).toBeTruthy();
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Owned for 8 months')).toBeTruthy();
    expect(screen.getByText('Bought 13 Aug 2026')).toBeTruthy();
  });

  it('leaves the duration out when it could not be worked out', async () => {
    await renderWithProviders(<PurchaseIdentity purchase={purchase()} ownedFor={null} />);

    expect(screen.queryByText(/^Owned for/)).toBeNull();
    expect(screen.getByText('Home')).toBeTruthy();
  });

  it('says the same thing in dark mode', async () => {
    await renderWithProviders(<PurchaseIdentity purchase={purchase()} ownedFor="2 years" />, {
      themeMode: 'dark',
    });

    expect(screen.getByText('Espresso machine')).toBeTruthy();
    expect(screen.getByText('Owned for 2 years')).toBeTruthy();
  });
});

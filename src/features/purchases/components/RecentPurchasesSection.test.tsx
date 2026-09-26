import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { PurchaseWithStats } from '@/types/domain';

import { PurchaseList } from './PurchaseList';
import { RecentPurchasesSection } from './RecentPurchasesSection';

/**
 * Purchases as Home and the Purchases tab show them: a short preview with the
 * same three states as the wishlist's, and the full list, whose order is chosen
 * in its header and applied by the caller's query.
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

function handlers(): { onSelect: jest.Mock; onSeeAll: jest.Mock; onAdd: jest.Mock } {
  return { onSelect: jest.fn(), onSeeAll: jest.fn(), onAdd: jest.fn() };
}

describe('RecentPurchasesSection', () => {
  it('lists the purchases, opens the one tapped and offers the rest', async () => {
    const callbacks = handlers();
    const machine = purchase();
    await renderWithProviders(
      <RecentPurchasesSection purchases={[machine]} isLoading={false} {...callbacks} />,
    );

    await fireEvent.press(screen.getByText('Espresso machine'));
    await fireEvent.press(screen.getByText('See all'));

    expect(callbacks.onSelect).toHaveBeenCalledWith(machine);
    expect(callbacks.onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('invites a first purchase instead of showing an empty card', async () => {
    const callbacks = handlers();
    await renderWithProviders(
      <RecentPurchasesSection purchases={[]} isLoading={false} {...callbacks} />,
    );

    expect(screen.getByText('No purchases tracked')).toBeTruthy();
    expect(screen.queryByText('See all')).toBeNull();

    await fireEvent.press(screen.getByText('Add a purchase'));

    expect(callbacks.onAdd).toHaveBeenCalledTimes(1);
  });

  it('shows neither the list nor the invitation while reading', async () => {
    await renderWithProviders(
      <RecentPurchasesSection purchases={null} isLoading {...handlers()} />,
    );

    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(screen.queryByText('No purchases tracked')).toBeNull();
  });
});

describe('PurchaseList', () => {
  it('lists every purchase under the sort bar, and hands a new order back', async () => {
    const onSortChange = jest.fn();
    const onSelect = jest.fn();
    const bike = purchase({ id: 'p2', name: 'Bike' });
    await renderWithProviders(
      <PurchaseList
        purchases={[purchase(), bike]}
        sort="recent"
        onSortChange={onSortChange}
        onSelect={onSelect}
        isRefreshing={false}
        onRefresh={jest.fn()}
      />,
    );

    expect(screen.getByText('Espresso machine')).toBeTruthy();

    await fireEvent.press(screen.getByText('Bike'));
    await fireEvent.press(screen.getByLabelText('Most used'));

    expect(onSelect).toHaveBeenCalledWith(bike);
    expect(onSortChange).toHaveBeenCalledWith('most_used');
  });
});

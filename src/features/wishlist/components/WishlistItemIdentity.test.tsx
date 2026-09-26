import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { WishlistItem } from '@/types/domain';

import { WishlistItemIdentity } from './WishlistItemIdentity';

/** The facts the reflection is about, in the user's currency, before any figure is set beside them. */

function item(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: 'w1',
    name: 'Camera',
    priceCents: 179_900,
    categoryId: 'photography',
    imageUri: null,
    expectedUsageFrequency: 'several_times_week',
    customUsesPerMonth: null,
    expectedOwnershipMonths: 60,
    cooldownDays: 7,
    cooldownStartedAt: '2026-08-06T09:00:00.000Z',
    cooldownEndsAt: '2026-08-13T09:00:00.000Z',
    status: 'thinking',
    notes: null,
    decidedAt: null,
    createdAt: '2026-08-06T09:00:00.000Z',
    updatedAt: '2026-08-06T09:00:00.000Z',
    ...overrides,
  };
}

describe('WishlistItemIdentity', () => {
  it('names the item, its price and its category', async () => {
    await renderWithProviders(<WishlistItemIdentity item={item()} />);

    expect(screen.getByText('Camera')).toBeTruthy();
    expect(screen.getByText('EUR 1,799')).toBeTruthy();
    expect(screen.getByText('Photography')).toBeTruthy();
  });

  it('labels the price with the currency chosen in settings', async () => {
    await renderWithProviders(<WishlistItemIdentity item={item()} />, {
      settings: { currencyCode: 'CHF' },
    });

    expect(screen.getByText('CHF 1,799')).toBeTruthy();
  });
});

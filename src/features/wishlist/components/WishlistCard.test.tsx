import { screen, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { WishlistItem } from '@/types/domain';

import { WishlistCard } from './WishlistCard';

/**
 * A row in "Thinking about".
 *
 * The row's job is to say how much longer the user has agreed to wait, so the
 * remaining time is asserted in both states — counting down and elapsed — and so
 * is what happens to a long name, which must give way to the price rather than
 * push it off the row.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

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
    cooldownStartedAt: new Date(Date.now() - DAY_MS).toISOString(),
    cooldownEndsAt: new Date(Date.now() + 6 * DAY_MS).toISOString(),
    status: 'thinking',
    reasonTags: [],
    notes: null,
    decidedAt: null,
    createdAt: '2026-08-06T09:00:00.000Z',
    updatedAt: '2026-08-06T09:00:00.000Z',
    ...overrides,
  };
}

describe('WishlistCard', () => {
  it('shows the price and how much of the reflection period is left', async () => {
    await renderWithProviders(<WishlistCard item={item()} onPress={jest.fn()} />);

    expect(screen.getByText('Camera')).toBeTruthy();
    expect(screen.getByText('€1,799')).toBeTruthy();
    expect(screen.getByText('6 days left')).toBeTruthy();
  });

  it('says the period is over instead of counting to zero', async () => {
    await renderWithProviders(
      <WishlistCard
        item={item({
          cooldownStartedAt: new Date(Date.now() - 8 * DAY_MS).toISOString(),
          cooldownEndsAt: new Date(Date.now() - DAY_MS).toISOString(),
        })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Ready to decide')).toBeTruthy();
  });

  it('switches to hours on the last day', async () => {
    await renderWithProviders(
      <WishlistCard
        item={item({ cooldownEndsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('6h left')).toBeTruthy();
  });

  it('opens the item when pressed', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<WishlistCard item={item()} onPress={onPress} />);

    await fireEvent.press(screen.getByLabelText('Camera, 6 days left'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('truncates a long name to one line rather than pushing the price out', async () => {
    // 80 characters is the longest name the form accepts.
    const longName = 'A'.repeat(80);
    await renderWithProviders(<WishlistCard item={item({ name: longName })} onPress={jest.fn()} />);

    expect(screen.getByText(longName).props.numberOfLines).toBe(1);
    expect(screen.getByText('€1,799')).toBeTruthy();
    expect(screen.getByText('6 days left')).toBeTruthy();
  });
});

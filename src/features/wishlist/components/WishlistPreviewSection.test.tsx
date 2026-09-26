import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { WishlistItem } from '@/types/domain';

import { WishlistGroup } from './WishlistGroup';
import { WishlistPreviewSection } from './WishlistPreviewSection';

/**
 * The wishlist as Home and the full list show it. The three states a preview
 * can be in are asserted — reading, empty, and with items — together with the
 * rule that "See all" only appears once there is something to see.
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
    notes: null,
    decidedAt: null,
    createdAt: '2026-08-06T09:00:00.000Z',
    updatedAt: '2026-08-06T09:00:00.000Z',
    ...overrides,
  };
}

function handlers(): { onSelect: jest.Mock; onSeeAll: jest.Mock; onAdd: jest.Mock } {
  return { onSelect: jest.fn(), onSeeAll: jest.fn(), onAdd: jest.fn() };
}

describe('WishlistPreviewSection', () => {
  it('lists the items and opens the one tapped', async () => {
    const callbacks = handlers();
    const camera = item();
    await renderWithProviders(
      <WishlistPreviewSection
        items={[camera, item({ id: 'w2', name: 'Tent' })]}
        isLoading={false}
        {...callbacks}
      />,
    );

    await fireEvent.press(screen.getByText('Camera'));

    expect(screen.getByText('Tent')).toBeTruthy();
    expect(callbacks.onSelect).toHaveBeenCalledWith(camera);
  });

  it('offers "See all" once there is something to see', async () => {
    const callbacks = handlers();
    await renderWithProviders(
      <WishlistPreviewSection items={[item()]} isLoading={false} {...callbacks} />,
    );

    await fireEvent.press(screen.getByText('See all'));

    expect(callbacks.onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('invites a first item instead of showing an empty card', async () => {
    const callbacks = handlers();
    await renderWithProviders(
      <WishlistPreviewSection items={[]} isLoading={false} {...callbacks} />,
    );

    expect(screen.getByText('Nothing on your mind yet')).toBeTruthy();
    expect(screen.queryByText('See all')).toBeNull();

    await fireEvent.press(screen.getByText('Add an item'));

    expect(callbacks.onAdd).toHaveBeenCalledTimes(1);
  });

  it('shows neither the list nor the invitation while reading', async () => {
    await renderWithProviders(<WishlistPreviewSection items={null} isLoading {...handlers()} />);

    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(screen.queryByText('Nothing on your mind yet')).toBeNull();
  });
});

describe('WishlistGroup', () => {
  it('lists its items under the heading, and opens the one tapped', async () => {
    const onSelect = jest.fn();
    const tent = item({ id: 'w2', name: 'Tent' });
    await renderWithProviders(
      <WishlistGroup
        title="Ready to decide"
        subtitle="The reflection period is over"
        items={[tent]}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText('Ready to decide')).toBeTruthy();
    expect(screen.getByText('The reflection period is over')).toBeTruthy();

    await fireEvent.press(screen.getByText('Tent'));

    expect(onSelect).toHaveBeenCalledWith(tent);
  });
});

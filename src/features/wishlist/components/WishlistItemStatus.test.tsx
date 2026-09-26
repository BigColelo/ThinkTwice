import { screen } from '@testing-library/react-native';

import { calculateCooldownState } from '@/domain';
import { renderWithProviders } from '@/test/renderWithProviders';

import { WishlistItemStatus } from './WishlistItemStatus';

/**
 * Where an item stands. A decided item must never show a countdown — the
 * reflection is over — and the two decisions are stated as facts, neither
 * celebrated nor regretted.
 */

const NOW = new Date('2026-08-13T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const cooldown = calculateCooldownState(
  {
    cooldownDays: 7,
    cooldownStartedAt: new Date(NOW.getTime() - DAY_MS).toISOString(),
    cooldownEndsAt: new Date(NOW.getTime() + 6 * DAY_MS).toISOString(),
  },
  NOW,
);

describe('WishlistItemStatus', () => {
  it('shows the reflection period while the item is being thought about', async () => {
    await renderWithProviders(
      <WishlistItemStatus item={{ status: 'thinking', cooldownDays: 7 }} cooldown={cooldown} />,
    );

    expect(screen.getByText(/6 days/)).toBeTruthy();
  });

  it.each([
    ['purchased', 'You bought this'],
    ['dismissed', 'You decided against this'],
  ] as const)('states a %s item as decided, with no countdown', async (status, label) => {
    await renderWithProviders(
      <WishlistItemStatus item={{ status, cooldownDays: 7 }} cooldown={cooldown} />,
    );

    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText(/6 days/)).toBeNull();
  });

  it('shows nothing for a period whose dates cannot be read', async () => {
    await renderWithProviders(
      <WishlistItemStatus item={{ status: 'thinking', cooldownDays: 7 }} cooldown={null} />,
    );

    expect(screen.queryByText(/./)).toBeNull();
  });
});

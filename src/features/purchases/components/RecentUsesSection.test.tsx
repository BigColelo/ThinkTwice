import { screen, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { UsageEvent } from '@/types/domain';
import { confirm } from '@/utils/confirm';

import { RecentUsesSection } from './RecentUsesSection';

jest.mock('@/utils/confirm', () => ({ confirm: jest.fn(async () => true) }));

/**
 * The correction path for a use recorded by mistake and noticed later.
 *
 * Removing is destructive and irreversible, so the confirmation is asserted as
 * carefully as the removal itself: no confirmation, no removal.
 */

const mockedConfirm = jest.mocked(confirm);

function use(overrides: Partial<UsageEvent> = {}): UsageEvent {
  return {
    id: 'u1',
    purchaseId: 'p1',
    occurredAt: '2026-08-13T09:12:00.000Z',
    count: 1,
    createdAt: '2026-08-13T09:12:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedConfirm.mockResolvedValue(true);
});

describe('RecentUsesSection', () => {
  it('renders nothing at all when there are no uses', async () => {
    await renderWithProviders(
      <RecentUsesSection uses={[]} limit={10} onRemove={jest.fn(async () => undefined)} />,
    );

    expect(screen.queryByText('Recent uses')).toBeNull();
  });

  it('lists when each use happened', async () => {
    await renderWithProviders(
      <RecentUsesSection uses={[use()]} limit={10} onRemove={jest.fn(async () => undefined)} />,
    );

    expect(screen.getByText('Recent uses')).toBeTruthy();
    expect(screen.getByText(/^13 Aug 2026/)).toBeTruthy();
    expect(screen.getByText('Tap one to remove it.')).toBeTruthy();
  });

  it('admits when the list is only the most recent', async () => {
    const uses = Array.from({ length: 3 }, (_, index) => use({ id: `u${index}` }));

    await renderWithProviders(
      <RecentUsesSection uses={uses} limit={3} onRemove={jest.fn(async () => undefined)} />,
    );

    expect(screen.getByText('The last 3. Tap one to remove it.')).toBeTruthy();
  });

  it('asks before removing, then hands the use to the caller', async () => {
    const onRemove = jest.fn(async () => undefined);
    const recorded = use();
    await renderWithProviders(
      <RecentUsesSection uses={[recorded]} limit={10} onRemove={onRemove} />,
    );

    await fireEvent.press(screen.getByText(/^13 Aug 2026/));

    expect(mockedConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Remove this use?', destructive: true }),
    );
    expect(onRemove).toHaveBeenCalledWith(recorded);
  });

  it('removes nothing when the confirmation is declined', async () => {
    mockedConfirm.mockResolvedValue(false);
    const onRemove = jest.fn(async () => undefined);
    await renderWithProviders(<RecentUsesSection uses={[use()]} limit={10} onRemove={onRemove} />);

    await fireEvent.press(screen.getByText(/^13 Aug 2026/));

    expect(onRemove).not.toHaveBeenCalled();
  });

  it('spells out a use that counted for more than one', async () => {
    await renderWithProviders(
      <RecentUsesSection
        uses={[use({ count: 3 })]}
        limit={10}
        onRemove={jest.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText('3 uses')).toBeTruthy();
  });
});

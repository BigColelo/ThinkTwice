import { screen, fireEvent } from '@testing-library/react-native';

import { recordUse, undoLastUse } from '@/features/purchases/services/purchaseActions';
import { renderWithProviders } from '@/test/renderWithProviders';

import { UsageActionCard } from './UsageActionCard';

jest.mock('@/db/DatabaseProvider', () => ({
  // The card only forwards this to the services, which are mocked below.
  useRepositories: () => ({}),
}));

jest.mock('@/features/purchases/services/purchaseActions', () => ({
  recordUse: jest.fn(async () => undefined),
  undoLastUse: jest.fn(async () => undefined),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

/**
 * The action the user repeats for years.
 *
 * What is asserted is the bargain the design makes: one tap with no form and no
 * confirmation, made safe by an undo that appears immediately after — and a
 * failure that says so rather than leaving the user guessing whether it counted.
 */

const mockedRecordUse = jest.mocked(recordUse);
const mockedUndoLastUse = jest.mocked(undoLastUse);

beforeEach(() => {
  jest.clearAllMocks();
  mockedRecordUse.mockResolvedValue(undefined as never);
  mockedUndoLastUse.mockResolvedValue(null);
});

describe('UsageActionCard', () => {
  it('shows the count and the cost per use', async () => {
    await renderWithProviders(
      <UsageActionCard
        purchaseId="p1"
        totalUses={1_820}
        realCostPerUseCents={35.71}
        lastUsedAt={null}
      />,
    );

    expect(screen.getByText('1,820')).toBeTruthy();
    expect(screen.getByText('EUR 0.36')).toBeTruthy();
    expect(screen.getByText('1,820 uses recorded so far')).toBeTruthy();
  });

  it('invites a first use instead of showing a cost per use of zero', async () => {
    await renderWithProviders(
      <UsageActionCard
        purchaseId="p1"
        totalUses={0}
        realCostPerUseCents={null}
        lastUsedAt={null}
      />,
    );

    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText(/Record a use each time you reach for it/)).toBeTruthy();
    expect(screen.queryByText(/recorded so far/)).toBeNull();
  });

  it('records a use in a single tap, with no confirmation to get through', async () => {
    await renderWithProviders(
      <UsageActionCard purchaseId="p1" totalUses={3} realCostPerUseCents={100} lastUsedAt={null} />,
    );

    await fireEvent.press(screen.getByText('I used it'));

    expect(mockedRecordUse).toHaveBeenCalledTimes(1);
    expect(mockedRecordUse.mock.calls[0]?.[1]).toBe('p1');
  });

  it('offers undo only once there is something to undo', async () => {
    await renderWithProviders(
      <UsageActionCard purchaseId="p1" totalUses={3} realCostPerUseCents={100} lastUsedAt={null} />,
    );
    expect(screen.queryByText('Undo last use')).toBeNull();

    await fireEvent.press(screen.getByText('I used it'));

    expect(screen.getByText('Undo last use')).toBeTruthy();
  });

  it('takes the use back and stops offering to do it again', async () => {
    await renderWithProviders(
      <UsageActionCard purchaseId="p1" totalUses={3} realCostPerUseCents={100} lastUsedAt={null} />,
    );

    await fireEvent.press(screen.getByText('I used it'));
    await fireEvent.press(screen.getByText('Undo last use'));

    expect(mockedUndoLastUse).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Undo last use')).toBeNull();
  });

  it('says a recording failed, and does not pretend it happened', async () => {
    mockedRecordUse.mockRejectedValue(new Error('disk full'));
    await renderWithProviders(
      <UsageActionCard purchaseId="p1" totalUses={3} realCostPerUseCents={100} lastUsedAt={null} />,
    );

    await fireEvent.press(screen.getByText('I used it'));

    expect(screen.getByText('That use could not be recorded. Please try again.')).toBeTruthy();
    // No undo, because there is nothing to undo.
    expect(screen.queryByText('Undo last use')).toBeNull();
  });

  it('shows when it was last used, and steps aside while undo is on offer', async () => {
    await renderWithProviders(
      <UsageActionCard
        purchaseId="p1"
        totalUses={3}
        realCostPerUseCents={100}
        lastUsedAt="2026-08-13T09:12:00.000Z"
      />,
    );
    expect(screen.getByText(/^Last used /)).toBeTruthy();

    await fireEvent.press(screen.getByText('I used it'));

    // The stored timestamp is now out of date until the screen re-reads.
    expect(screen.queryByText(/^Last used /)).toBeNull();
  });
});

import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { RecurringCommitment } from '@/types/domain';

import { CommitmentRow } from './CommitmentRow';

/**
 * A paused commitment stays in the list but counts for nothing, so the row has
 * to say which of the two it is — in words, not by fading, because the figure
 * still has to be readable.
 */

function commitment(overrides: Partial<RecurringCommitment> = {}): RecurringCommitment {
  return {
    id: 'c1',
    name: 'Rent',
    amountCents: 60_000,
    frequency: 'monthly',
    categoryId: 'housing',
    isActive: true,
    createdAt: '2026-08-13T09:00:00.000Z',
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  };
}

describe('CommitmentRow', () => {
  it('announces an active commitment without a state', async () => {
    await renderWithProviders(<CommitmentRow commitment={commitment()} onPress={jest.fn()} />);

    expect(screen.getByText('Rent')).toBeTruthy();
    expect(screen.getByText('€600')).toBeTruthy();
    expect(screen.getByLabelText('Rent, Housing, Monthly')).toBeTruthy();
    expect(screen.queryByText(/Paused/)).toBeNull();
  });

  it('shows the monthly equivalent when the bill is not monthly', async () => {
    await renderWithProviders(
      <CommitmentRow
        commitment={commitment({ frequency: 'quarterly', amountCents: 24_000 })}
        onPress={jest.fn()}
      />,
    );

    // €240 a quarter is €80 a month, so a quarterly charge is never read as one.
    expect(screen.getByText('€80 / month')).toBeTruthy();
  });

  it('says a paused commitment is paused, in the row and to a screen reader', async () => {
    await renderWithProviders(
      <CommitmentRow commitment={commitment({ isActive: false })} onPress={jest.fn()} />,
    );

    expect(screen.getByText('Paused · Housing')).toBeTruthy();
    expect(screen.getByLabelText('Rent, Housing, Monthly, paused')).toBeTruthy();
    // The amount is still printed: it is what the user pays when they resume.
    expect(screen.getByText('€600')).toBeTruthy();
  });
});

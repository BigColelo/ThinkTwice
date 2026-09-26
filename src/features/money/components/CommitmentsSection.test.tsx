import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { RecurringCommitment } from '@/types/domain';

import { CommitmentsSection } from './CommitmentsSection';

/**
 * The money that leaves every month before any purchase is weighed. What is
 * asserted is how the section counts: paused commitments are listed but never
 * totalled, and a user with none is told what belongs here rather than shown a
 * total of zero.
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

function renderSection(
  props: Partial<React.ComponentProps<typeof CommitmentsSection>> = {},
): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <CommitmentsSection
      commitments={[]}
      pausedCommitments={[]}
      monthlyTotalCents={0}
      annualTotalCents={0}
      onSelect={jest.fn()}
      onAdd={jest.fn()}
      {...props}
    />,
  );
}

describe('CommitmentsSection', () => {
  it('lists the active commitments with their total per month and per year', async () => {
    await renderSection({
      commitments: [commitment(), commitment({ id: 'c2', name: 'Gym', amountCents: 3_500 })],
      monthlyTotalCents: 63_500,
      annualTotalCents: 762_000,
    });

    expect(screen.getByText('2 active')).toBeTruthy();
    expect(screen.getByText('Rent')).toBeTruthy();
    expect(screen.getByText('Gym')).toBeTruthy();
    expect(screen.getByText('EUR 635 / month')).toBeTruthy();
    expect(screen.getByText('EUR 7,620 / year')).toBeTruthy();
  });

  it('lists paused commitments apart, and counts them apart', async () => {
    await renderSection({
      commitments: [commitment()],
      pausedCommitments: [commitment({ id: 'c3', name: 'Magazine', isActive: false })],
      monthlyTotalCents: 60_000,
      annualTotalCents: 720_000,
    });

    expect(screen.getByText('1 active, 1 paused')).toBeTruthy();
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.getByText('Magazine')).toBeTruthy();
    // The total is the caller's figure over active commitments only.
    expect(screen.getByText('EUR 600 / month')).toBeTruthy();
  });

  it('explains what belongs here instead of totalling nothing', async () => {
    await renderSection();

    expect(screen.getByText('No commitments yet')).toBeTruthy();
    expect(screen.getByText('Rent, utilities, subscriptions, insurance')).toBeTruthy();
    expect(screen.queryByText('Total')).toBeNull();
  });

  it('opens the commitment tapped, paused ones included, and adds new ones', async () => {
    const onSelect = jest.fn();
    const onAdd = jest.fn();
    const paused = commitment({ id: 'c3', name: 'Magazine', isActive: false });
    await renderSection({ pausedCommitments: [paused], onSelect, onAdd });

    await fireEvent.press(screen.getByText('Magazine'));
    await fireEvent.press(screen.getByLabelText('Add commitment'));

    expect(onSelect).toHaveBeenCalledWith(paused);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

import { screen } from '@testing-library/react-native';

import { calculateUsageEstimate } from '@/domain';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ExpectedUsageCard } from './ExpectedUsageCard';

/**
 * The estimate the decision is being made on. It is built here with the same
 * domain function the form previews with, so the card cannot show a pair of
 * figures the app would never produce — and a figure that cannot be worked out
 * is a dash, never a zero.
 */

const expectation = {
  expectedUsageFrequency: 'several_times_week',
  customUsesPerMonth: null,
  expectedOwnershipMonths: 60,
} as const;

describe('ExpectedUsageCard', () => {
  it('states the expectation and what it makes each use cost', async () => {
    const estimate = calculateUsageEstimate(179_900, {
      frequency: expectation.expectedUsageFrequency,
      customUsesPerMonth: null,
      expectedOwnershipMonths: expectation.expectedOwnershipMonths,
    });

    await renderWithProviders(<ExpectedUsageCard item={expectation} estimate={estimate} />);

    expect(screen.getByText('2–3 times per week')).toBeTruthy();
    expect(screen.getByText('5 years')).toBeTruthy();
    expect(screen.getByText('650')).toBeTruthy();
    expect(screen.getByText('EUR 2.77')).toBeTruthy();
  });

  it('shows a dash for figures the inputs cannot give', async () => {
    await renderWithProviders(
      <ExpectedUsageCard
        item={expectation}
        estimate={{ estimatedUses: null, costPerUseCents: null }}
      />,
    );

    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText(/EUR 0/)).toBeNull();
  });
});

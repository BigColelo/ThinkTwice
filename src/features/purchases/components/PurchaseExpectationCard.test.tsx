import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { PurchaseExpectationCard } from './PurchaseExpectationCard';

/**
 * What was expected, next to what happened. Each chip appears only when its
 * figure exists: a blank expectation is not "never", and a rate for an item
 * bought this week is not a rate.
 */

describe('PurchaseExpectationCard', () => {
  it('sets the expectation beside the rate actually reached', async () => {
    await renderWithProviders(
      <PurchaseExpectationCard
        purchase={{
          expectedUsageFrequency: 'several_times_week',
          customUsesPerMonth: null,
          expectedOwnershipMonths: 60,
        }}
        usesPerMonth={8.26}
      />,
    );

    expect(screen.getByText('2–3 times per week')).toBeTruthy();
    expect(screen.getByText('Actually 8.3 / month')).toBeTruthy();
    expect(screen.getByText('5 years')).toBeTruthy();
  });

  it('leaves out whatever was never set, and a rate there is no history for', async () => {
    await renderWithProviders(
      <PurchaseExpectationCard
        purchase={{
          expectedUsageFrequency: null,
          customUsesPerMonth: null,
          expectedOwnershipMonths: 24,
        }}
        usesPerMonth={null}
      />,
    );

    expect(screen.getByText('2 years')).toBeTruthy();
    expect(screen.queryByText(/per week|per month|Actually/)).toBeNull();
  });
});

import { fireEvent, screen } from '@testing-library/react-native';

import type { InsightsSummary, ValueHighlight } from '@/domain';
import { renderWithProviders } from '@/test/renderWithProviders';

import { InsightsReport } from './InsightsReport';

/**
 * The report shows only what there is data for. A range with decisions and no
 * purchases must not print a €0 average, and an average must say how many items
 * it was taken over and how many it left out — otherwise the figure reads as a
 * statement about everything the user owns.
 */

function highlight(overrides: Partial<ValueHighlight> = {}): ValueHighlight {
  return {
    purchaseId: 'p1',
    name: 'Running shoes',
    categoryId: 'sport',
    imageUri: null,
    costPerUseCents: 86.09,
    totalUses: 151,
    ...overrides,
  };
}

function summary(overrides: Partial<InsightsSummary> = {}): InsightsSummary {
  return {
    range: 'this_year',
    purchaseCount: 0,
    totalTrackedPurchaseValueCents: 0,
    totalAdditionalExpensesCents: 0,
    totalUses: 0,
    averageCostPerUseCents: null,
    itemsWithUsage: 0,
    itemsWithoutUsage: 0,
    bestValue: null,
    highestCostPerUse: null,
    monthlyCommitmentsCents: 78_300,
    annualCommitmentsCents: 939_600,
    spendingByCategory: [],
    avoidedPurchaseCount: 0,
    avoidedPurchaseValueCents: 0,
    isEmpty: false,
    ...overrides,
  };
}

describe('InsightsReport', () => {
  it('reports the totals and says what the average was taken over', async () => {
    await renderWithProviders(
      <InsightsReport
        summary={summary({
          purchaseCount: 3,
          totalTrackedPurchaseValueCents: 250_000,
          averageCostPerUseCents: 412.5,
          itemsWithUsage: 2,
          itemsWithoutUsage: 1,
        })}
        onOpenPurchase={jest.fn()}
      />,
    );

    expect(screen.getByText('3 items')).toBeTruthy();
    expect(screen.getByText('EUR 2,500')).toBeTruthy();
    expect(screen.getByText('EUR 4.13')).toBeTruthy();
    expect(screen.getByText('From 2 items with uses')).toBeTruthy();
    expect(
      screen.getByText('1 item without recorded uses is excluded from the average.'),
    ).toBeTruthy();
  });

  it('prints no purchase figures for a range with only decisions in it', async () => {
    await renderWithProviders(
      <InsightsReport
        summary={summary({ avoidedPurchaseCount: 2, avoidedPurchaseValueCents: 90_000 })}
        onOpenPurchase={jest.fn()}
      />,
    );

    expect(screen.queryByText('Tracked purchases')).toBeNull();
    expect(screen.queryByText('Average cost/use')).toBeNull();
    expect(screen.getByText('Decided against')).toBeTruthy();
  });

  it('opens the purchase behind either end of the cost-per-use range', async () => {
    const onOpenPurchase = jest.fn();
    await renderWithProviders(
      <InsightsReport
        summary={summary({
          purchaseCount: 2,
          itemsWithUsage: 2,
          bestValue: highlight(),
          highestCostPerUse: highlight({ purchaseId: 'p2', name: 'Stand mixer' }),
        })}
        onOpenPurchase={onOpenPurchase}
      />,
    );

    await fireEvent.press(screen.getByText('Running shoes'));
    await fireEvent.press(screen.getByText('Stand mixer'));

    expect(onOpenPurchase.mock.calls).toEqual([['p1'], ['p2']]);
  });

  it('always states the recurring commitments, per month and per year', async () => {
    await renderWithProviders(<InsightsReport summary={summary()} onOpenPurchase={jest.fn()} />);

    expect(screen.getByText('Per month')).toBeTruthy();
    expect(screen.getByText('EUR 783')).toBeTruthy();
    expect(screen.getByText('EUR 9,396')).toBeTruthy();
  });
});

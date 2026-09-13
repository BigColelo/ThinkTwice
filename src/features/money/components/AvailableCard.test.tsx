import { screen, fireEvent } from '@testing-library/react-native';

import { EMPTY_MONTHLY_FINANCES, type MonthlyFinances } from '@/domain';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AvailableCard } from './AvailableCard';

/**
 * The first figure a user sees, and the one every impact percentage divides by.
 *
 * The cases worth pinning are the two where the arithmetic has no answer: no
 * income at all, and a month whose commitments have eaten it. Neither may render
 * a number — a `0%` in the ring would read as a real share, and `NaN` or
 * `Infinity` must never reach the screen at all.
 */

function finances(overrides: Partial<MonthlyFinances> = {}): MonthlyFinances {
  return {
    ...EMPTY_MONTHLY_FINANCES,
    netIncomeCents: 165_000,
    commitmentsCents: 78_300,
    availableAfterCommitmentsCents: 86_700,
    availableToIncomeRatio: 86_700 / 165_000,
    commitmentsToIncomeRatio: 78_300 / 165_000,
    isIncomeConfigured: true,
    ...overrides,
  };
}

describe('AvailableCard', () => {
  it('leads with what is left of the month', async () => {
    // €1,650 − €783 = €867, the worked example from the product spec.
    await renderWithProviders(<AvailableCard finances={finances()} onSetUpIncome={jest.fn()} />);

    expect(screen.getByText('Available after commitments')).toBeTruthy();
    expect(screen.getByText(/EUR\s867/)).toBeTruthy();
    expect(screen.getByText(/EUR\s1,650/)).toBeTruthy();
    expect(screen.getByText(/EUR\s783/)).toBeTruthy();
  });

  it('shows the same share as a ring and as a figure, never two different ones', async () => {
    await renderWithProviders(<AvailableCard finances={finances()} onSetUpIncome={jest.fn()} />);

    expect(screen.getByText('53%')).toBeTruthy();
    expect(screen.getByLabelText('53% of monthly income remains available')).toBeTruthy();
  });

  it('leaves the savings goal out when there is none, rather than showing a zero', async () => {
    await renderWithProviders(<AvailableCard finances={finances()} onSetUpIncome={jest.fn()} />);

    expect(screen.queryByText('Savings goal')).toBeNull();
  });

  it('shows the savings goal once one is set', async () => {
    await renderWithProviders(
      <AvailableCard
        finances={finances({ savingsTargetCents: 30_000 })}
        onSetUpIncome={jest.fn()}
      />,
    );

    expect(screen.getByText('Savings goal')).toBeTruthy();
    expect(screen.getByText(/EUR\s300/)).toBeTruthy();
  });

  it('asks for an income instead of reporting one it does not have', async () => {
    const onSetUpIncome = jest.fn();
    await renderWithProviders(
      <AvailableCard finances={EMPTY_MONTHLY_FINANCES} onSetUpIncome={onSetUpIncome} />,
    );

    expect(screen.getByText('Set up your monthly picture')).toBeTruthy();
    expect(screen.queryByText('Available after commitments')).toBeNull();

    await fireEvent.press(screen.getByText('Set up your monthly picture'));
    expect(onSetUpIncome).toHaveBeenCalledTimes(1);
  });

  it('states a month in the red rather than hiding it', async () => {
    await renderWithProviders(
      <AvailableCard
        finances={finances({
          commitmentsCents: 180_000,
          availableAfterCommitmentsCents: -15_000,
          availableToIncomeRatio: -15_000 / 165_000,
          commitmentsExceedIncome: true,
        })}
        onSetUpIncome={jest.fn()}
      />,
    );

    expect(screen.getByText(/-EUR\s150/)).toBeTruthy();
  });

  it('never renders NaN or Infinity, whatever the figures', async () => {
    await renderWithProviders(
      <AvailableCard
        finances={finances({
          netIncomeCents: 0,
          availableAfterCommitmentsCents: 0,
          availableToIncomeRatio: null,
        })}
        onSetUpIncome={jest.fn()}
      />,
    );

    expect(screen.queryByText(/NaN|Infinity/)).toBeNull();
  });
});

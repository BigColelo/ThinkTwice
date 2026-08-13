import { screen } from '@testing-library/react-native';

import type { MonthlyFinances } from '@/domain';
import { calculatePurchaseImpact } from '@/domain';
import { renderWithProviders } from '@/test/renderWithProviders';

import { PurchaseImpactCard } from './PurchaseImpactCard';

const FINANCES: MonthlyFinances = {
  netIncomeCents: 165_000,
  commitmentsCents: 78_300,
  savingsTargetCents: null,
  availableAfterCommitmentsCents: 86_700,
  availableAfterSavingsGoalCents: null,
  availableToIncomeRatio: 86_700 / 165_000,
  commitmentsToIncomeRatio: 78_300 / 165_000,
  isIncomeConfigured: true,
  commitmentsExceedIncome: false,
};

describe('PurchaseImpactCard', () => {
  it('shows the three figures the product spec calls for', async () => {
    await renderWithProviders(
      <PurchaseImpactCard impact={calculatePurchaseImpact(179_900, FINANCES)} />,
    );

    expect(screen.getByText('109%')).toBeTruthy();
    expect(screen.getByText('207%')).toBeTruthy();
    expect(screen.getByText('2.1')).toBeTruthy();
    expect(screen.getByText('High financial impact')).toBeTruthy();
  });

  it('never tells the user whether they can afford something', async () => {
    await renderWithProviders(
      <PurchaseImpactCard impact={calculatePurchaseImpact(179_900, FINANCES)} />,
    );

    for (const phrase of [/afford/i, /you should/i, /bad purchase/i, /waste/i]) {
      expect(screen.queryByText(phrase)).toBeNull();
    }
  });

  it('explains why the figures are unavailable when no income is set', async () => {
    const impact = calculatePurchaseImpact(179_900, {
      ...FINANCES,
      isIncomeConfigured: false,
      netIncomeCents: 0,
    });

    await renderWithProviders(<PurchaseImpactCard impact={impact} />);

    expect(screen.getByText('Financial impact unavailable')).toBeTruthy();
    expect(screen.getByText(/Add your monthly net income/)).toBeTruthy();
  });

  it('keeps the income percentage when commitments consume all income', async () => {
    const impact = calculatePurchaseImpact(82_500, {
      ...FINANCES,
      commitmentsCents: 165_000,
      availableAfterCommitmentsCents: 0,
    });

    await renderWithProviders(<PurchaseImpactCard impact={impact} />);

    expect(screen.getByText('50%')).toBeTruthy();
    // No fabricated figure where one cannot be computed.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByText(/NaN|Infinity/)).toBeNull();
  });

  it('renders in dark mode without changing what it says', async () => {
    await renderWithProviders(
      <PurchaseImpactCard impact={calculatePurchaseImpact(179_900, FINANCES)} />,
      {
        themeMode: 'dark',
      },
    );

    expect(screen.getByText('109%')).toBeTruthy();
    expect(screen.getByText('High financial impact')).toBeTruthy();
  });
});

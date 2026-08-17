import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { AvoidedPurchasesCard } from './AvoidedPurchasesCard';

/**
 * The one figure in the app about money that was *not* spent — which is exactly
 * the figure most likely to drift into congratulating the user. The caption is
 * asserted alongside the number, because without it the number makes a claim.
 */

describe('AvoidedPurchasesCard', () => {
  it('states what was decided against and what it would have cost', async () => {
    await renderWithProviders(<AvoidedPurchasesCard count={3} totalCents={184_400} />);

    expect(screen.getByText('EUR 1,844')).toBeTruthy();
    expect(screen.getByText('3 items')).toBeTruthy();
    expect(screen.getByText('would have cost')).toBeTruthy();
  });

  it('reads correctly for a single item', async () => {
    await renderWithProviders(<AvoidedPurchasesCard count={1} totalCents={179_900} />);

    expect(screen.getByText('1 item')).toBeTruthy();
  });

  it('refuses to call the money saved', async () => {
    await renderWithProviders(<AvoidedPurchasesCard count={2} totalCents={50_000} />);

    expect(screen.getByText(/does not count it as money saved/)).toBeTruthy();
    for (const claim of [/you saved/i, /well done/i, /good job/i, /smart/i]) {
      expect(screen.queryByText(claim)).toBeNull();
    }
  });

  it('renders in dark mode without changing what it says', async () => {
    await renderWithProviders(<AvoidedPurchasesCard count={1} totalCents={179_900} />, {
      themeMode: 'dark',
    });

    expect(screen.getByText('EUR 1,799')).toBeTruthy();
    expect(screen.getByText('1 item')).toBeTruthy();
  });
});

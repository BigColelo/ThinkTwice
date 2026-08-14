import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { EstimatePreview } from './EstimatePreview';

/**
 * The estimate the user watches while filling in the form.
 *
 * The arithmetic itself is covered in `domain/wishlist/usage.test.ts`; what is
 * asserted here is the wiring between a correct figure and what appears on
 * screen — including the case where there is no figure yet, which must read as
 * an explicit dash rather than a zero or a `NaN`.
 */

describe('EstimatePreview', () => {
  it('shows the worked example from the product spec', async () => {
    await renderWithProviders(
      <EstimatePreview
        priceCents={179_900}
        frequency="several_times_week"
        customUsesPerMonth={null}
        expectedOwnershipMonths={60}
      />,
    );

    expect(screen.getByText('650')).toBeTruthy();
    expect(screen.getByText('€2.77')).toBeTruthy();
    // The inputs behind the figure are printed with it, so it reads as arithmetic.
    expect(screen.getByText('2–3 times per week for 5 years')).toBeTruthy();
  });

  it('keeps the cents of a rate that would vanish if rounded to whole euros', async () => {
    // €650 daily for 5 years is 36 cents a use — the figure only says something
    // because it is not rounded to the nearest euro.
    await renderWithProviders(
      <EstimatePreview
        priceCents={65_000}
        frequency="daily"
        customUsesPerMonth={null}
        expectedOwnershipMonths={60}
      />,
    );

    expect(screen.getByText('€0.36')).toBeTruthy();
    expect(screen.getByText('Daily for 5 years')).toBeTruthy();
  });

  it('uses the rate the user supplied for a custom frequency', async () => {
    await renderWithProviders(
      <EstimatePreview
        priceCents={12_000}
        frequency="custom"
        customUsesPerMonth={2}
        expectedOwnershipMonths={12}
      />,
    );

    expect(screen.getByText('24')).toBeTruthy();
    expect(screen.getByText('€5.00')).toBeTruthy();
    expect(screen.getByText('2 uses per month for 1 year')).toBeTruthy();
  });

  it('asks for the missing inputs instead of showing a figure it cannot compute', async () => {
    await renderWithProviders(
      <EstimatePreview
        priceCents={179_900}
        frequency={null}
        customUsesPerMonth={null}
        expectedOwnershipMonths={null}
      />,
    );

    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(
      screen.getByText('Choose how often you expect to use it and for how long.'),
    ).toBeTruthy();
    expect(screen.queryByText(/NaN|Infinity|€0.00/)).toBeNull();
  });

  it('shows no cost per use until a price has been entered', async () => {
    // The uses are known from the frequency alone; the cost per use is not.
    await renderWithProviders(
      <EstimatePreview
        priceCents={null}
        frequency="weekly"
        customUsesPerMonth={null}
        expectedOwnershipMonths={24}
      />,
    );

    expect(screen.getByText('104')).toBeTruthy();
    expect(screen.getAllByText('—')).toHaveLength(1);
  });

  it('renders in dark mode without changing what it says', async () => {
    await renderWithProviders(
      <EstimatePreview
        priceCents={179_900}
        frequency="several_times_week"
        customUsesPerMonth={null}
        expectedOwnershipMonths={60}
      />,
      { themeMode: 'dark' },
    );

    expect(screen.getByText('650')).toBeTruthy();
    expect(screen.getByText('€2.77')).toBeTruthy();
  });
});

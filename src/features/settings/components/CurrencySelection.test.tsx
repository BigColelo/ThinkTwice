import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { CurrencySelection } from './CurrencySelection';

/**
 * Switching currency relabels every figure the user has ever entered, so the
 * write is asserted together with the caption that says so.
 */

describe('CurrencySelection', () => {
  it('explains that amounts are relabelled, never converted', async () => {
    await renderWithProviders(<CurrencySelection />);

    expect(screen.getByText(/never converted/)).toBeTruthy();
  });

  it('stores the currency chosen', async () => {
    const updateSettings = jest.fn(async () => undefined);
    await renderWithProviders(<CurrencySelection />, {
      settings: { currencyCode: 'EUR' },
      updateSettings,
    });

    await fireEvent.press(screen.getByText('Swiss franc'));

    expect(updateSettings).toHaveBeenCalledWith({ currencyCode: 'CHF' });
  });

  it('does not write the currency already chosen', async () => {
    const updateSettings = jest.fn(async () => undefined);
    await renderWithProviders(<CurrencySelection />, {
      settings: { currencyCode: 'CHF' },
      updateSettings,
    });

    await fireEvent.press(screen.getByText('Swiss franc'));

    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('says so when the choice could not be stored', async () => {
    const updateSettings = jest.fn(async () => {
      throw new Error('database is locked');
    });
    await renderWithProviders(<CurrencySelection />, { updateSettings });

    await fireEvent.press(screen.getByText('Swiss franc'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This setting could not be saved. Please try again.',
    );
  });
});

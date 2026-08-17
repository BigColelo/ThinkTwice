import { fireEvent, screen } from '@testing-library/react-native';

import { CURRENCIES } from '@/constants/currencies';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CurrencyPicker } from './CurrencyPicker';

/**
 * The currency list.
 *
 * Amounts are never converted, so this list is the only thing standing between
 * a user and a set of figures relabelled into a currency they did not mean.
 * What is worth asserting is therefore: every currency is reachable, exactly one
 * of them is announced as chosen, the code travels back untouched, and the name
 * is in the language the list is being read in.
 */

describe('CurrencyPicker', () => {
  it('offers every currency, and each of them once', async () => {
    await renderWithProviders(<CurrencyPicker value="EUR" language="en" onSelect={jest.fn()} />);

    expect(screen.getAllByRole('radio')).toHaveLength(CURRENCIES.length);

    // A currency listed both under "Suggested" and under its region would put
    // the same question on screen twice, and answer it twice when it is chosen.
    for (const { code } of CURRENCIES) {
      expect(screen.getAllByText(code)).toHaveLength(1);
    }
  });

  it('names the currency and puts its ISO code on the supporting line', async () => {
    await renderWithProviders(<CurrencyPicker value="EUR" language="en" onSelect={jest.fn()} />);

    expect(screen.getByLabelText('Saudi riyal, SAR')).toBeTruthy();
    expect(screen.getByLabelText('UAE dirham, AED')).toBeTruthy();
  });

  it('shows no currency symbol — the code is what every amount is labelled with', async () => {
    await renderWithProviders(<CurrencyPicker value="EUR" language="en" onSelect={jest.fn()} />);

    expect(screen.queryByText(/[€$£¥₪]/)).toBeNull();
  });

  it('announces the chosen currency as the selected radio, and nothing else', async () => {
    await renderWithProviders(<CurrencyPicker value="SAR" language="en" onSelect={jest.fn()} />);

    expect(screen.getByLabelText('Saudi riyal, SAR').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Euro, EUR').props.accessibilityState.selected).toBe(false);

    const selected = screen
      .getAllByRole('radio')
      .filter((row) => row.props.accessibilityState?.selected === true);
    expect(selected).toHaveLength(1);
  });

  it('reports the code the user picked', async () => {
    const onSelect = jest.fn();
    await renderWithProviders(<CurrencyPicker value="EUR" language="en" onSelect={onSelect} />);

    await fireEvent.press(screen.getByLabelText('Moroccan dirham, MAD'));

    expect(onSelect).toHaveBeenCalledWith('MAD');
  });

  it('reads the names in the language the list is shown in', async () => {
    await renderWithProviders(<CurrencyPicker value="EUR" language="it" onSelect={jest.fn()} />, {
      language: 'it',
    });

    expect(screen.getByText('Riyal saudita')).toBeTruthy();
    expect(screen.getByText('Dirham degli Emirati')).toBeTruthy();
    // The code is the one part that does not translate.
    expect(screen.getByText('SAR')).toBeTruthy();
  });

  it.each([
    ['en', 'Suggested for English', 'Middle East & Africa'],
    ['it', 'Suggerite per Italiano', 'Medio Oriente e Africa'],
  ] as const)('%s heads its groups in its own language', async (language, suggested, region) => {
    await renderWithProviders(
      <CurrencyPicker value="EUR" language={language} onSelect={jest.fn()} />,
      { language },
    );

    expect(screen.getByText(suggested)).toBeTruthy();
    expect(screen.getByText(region)).toBeTruthy();
  });
});

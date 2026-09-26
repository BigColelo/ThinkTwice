import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { AppearanceCard } from './AppearanceCard';

/**
 * Three options whose names do not explain themselves — "System" in particular —
 * so the card is asserted on what it says about the current choice as much as on
 * the write it makes.
 */

describe('AppearanceCard', () => {
  it('offers the three modes, in order, with the stored one selected', async () => {
    await renderWithProviders(<AppearanceCard />, { settings: { themeMode: 'dark' } });

    const options = screen.getAllByRole('radio');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('System');
    expect(options[1]).toHaveTextContent('Light');
    expect(options[2]).toHaveTextContent('Dark');
    expect(screen.getByRole('radio', { name: 'Dark' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it.each([
    ['system', 'Following your device setting.'],
    ['light', 'Always light.'],
    ['dark', 'Always dark.'],
  ] as const)('says in words what %s means', async (themeMode, description) => {
    await renderWithProviders(<AppearanceCard />, { settings: { themeMode } });

    expect(screen.getByText(description)).toBeTruthy();
  });

  it('stores the mode chosen', async () => {
    const updateSettings = jest.fn(async () => undefined);
    await renderWithProviders(<AppearanceCard />, {
      settings: { themeMode: 'system' },
      updateSettings,
    });

    await fireEvent.press(screen.getByText('Dark'));

    expect(updateSettings).toHaveBeenCalledWith({ themeMode: 'dark' });
  });

  it('says so when the choice could not be stored', async () => {
    const updateSettings = jest.fn(async () => {
      throw new Error('database is locked');
    });
    await renderWithProviders(<AppearanceCard />, { updateSettings });

    await fireEvent.press(screen.getByText('Light'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This setting could not be saved. Please try again.',
    );
  });
});

import { render, screen, fireEvent } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import {
  FALLBACK_SETTINGS,
  SettingsContext,
  type SettingsContextValue,
} from '@/features/settings/SettingsProvider';
import { I18nProvider } from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ThemeProvider } from '@/theme';
import type { AppSettings } from '@/types/domain';

import { IncomeEditor } from './IncomeEditor';

/**
 * Income is the denominator of every impact percentage in the app, so the
 * editor's job is to keep anything the user did not type out of storage.
 *
 * Two states mean "nothing": a field left empty, and the zero the database holds
 * before an income is ever set. They have to look the same, or someone who
 * skipped onboarding is shown a `0` they must delete before they can type over
 * it. Saving is explicit for the same reason — a half-typed `1` on the way to
 * `1500` is a real figure the moment it is stored.
 */

function renderEditor(
  settings: Partial<AppSettings>,
  updateSettings?: SettingsContextValue['updateSettings'],
): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(<IncomeEditor />, { settings, updateSettings });
}

describe('IncomeEditor', () => {
  it('shows an unset income as empty, not as a zero the user has to delete', async () => {
    await renderEditor({ monthlyNetIncomeCents: 0, monthlySavingsTargetCents: null });

    expect(screen.getByLabelText('Monthly net income').props.value).toBe('');
    expect(screen.getByLabelText('Monthly savings target').props.value).toBe('');
  });

  it('opens on what is stored', async () => {
    await renderEditor({ monthlyNetIncomeCents: 165_000, monthlySavingsTargetCents: 30_000 });

    expect(screen.getByDisplayValue('1650')).toBeTruthy();
    expect(screen.getByDisplayValue('300')).toBeTruthy();
  });

  it('offers no save until something actually changed', async () => {
    await renderEditor({ monthlyNetIncomeCents: 165_000, monthlySavingsTargetCents: null });

    expect(screen.queryByText('Save changes')).toBeNull();
  });

  it('saves integer cents, once, when asked', async () => {
    const updateSettings = jest.fn(async () => undefined);
    await renderEditor(
      { monthlyNetIncomeCents: 0, monthlySavingsTargetCents: null },
      updateSettings,
    );

    await fireEvent.changeText(screen.getByLabelText('Monthly net income'), '1650');
    // Typing alone stores nothing: `1`, `16` and `165` are all figures too.
    expect(updateSettings).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Save changes'));

    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(updateSettings).toHaveBeenCalledWith({
      monthlyNetIncomeCents: 165_000,
      monthlySavingsTargetCents: null,
    });
  });

  it('refuses a negative income instead of storing one', async () => {
    // Nothing derived from a negative income means anything, and it is reachable
    // by pasting.
    const updateSettings = jest.fn(async () => undefined);
    await renderEditor(
      { monthlyNetIncomeCents: 165_000, monthlySavingsTargetCents: null },
      updateSettings,
    );

    await fireEvent.changeText(screen.getByLabelText('Monthly net income'), '-500');
    await fireEvent.press(screen.getByText('Save changes'));

    expect(updateSettings).not.toHaveBeenCalled();
    expect(screen.getByText('Income cannot be negative.')).toBeTruthy();
  });

  it('says so when the save fails, rather than looking saved', async () => {
    const updateSettings = jest.fn(async () => {
      throw new Error('storage');
    });
    await renderEditor(
      { monthlyNetIncomeCents: 0, monthlySavingsTargetCents: null },
      updateSettings,
    );

    await fireEvent.changeText(screen.getByLabelText('Monthly net income'), '1650');
    await fireEvent.press(screen.getByText('Save changes'));

    expect(
      await screen.findByText('Your changes could not be saved. Please try again.'),
    ).toBeTruthy();
  });
});

/**
 * The Money screen stays mounted for the whole life of the tabs, so settings
 * written somewhere else — onboarding finishing, a data reset, the development
 * seed — have to be picked up here. Left alone, the fields would keep offering
 * to save figures the app no longer holds.
 */
describe('IncomeEditor, when settings change underneath it', () => {
  const METRICS: Metrics = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
  };

  function Harness(): React.ReactElement {
    const [income, setIncome] = useState(165_000);
    const value: SettingsContextValue = {
      settings: { ...FALLBACK_SETTINGS, monthlyNetIncomeCents: income },
      isLoading: false,
      updateSettings: async () => undefined,
    };

    return (
      <SafeAreaProvider initialMetrics={METRICS}>
        <SettingsContext.Provider value={value}>
          <ThemeProvider mode="light">
            <I18nProvider language="en">
              <Pressable testID="reset" onPress={() => setIncome(0)}>
                <Text>reset elsewhere</Text>
              </Pressable>
              <IncomeEditor />
            </I18nProvider>
          </ThemeProvider>
        </SettingsContext.Provider>
      </SafeAreaProvider>
    );
  }

  it('adopts the new figure instead of offering to save the old one back', async () => {
    await render(<Harness />);
    expect(screen.getByDisplayValue('1650')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('reset'));

    expect(screen.getByLabelText('Monthly net income').props.value).toBe('');
    // The old figure is gone rather than sitting there as a pending change.
    expect(screen.queryByText('Save changes')).toBeNull();
  });
});

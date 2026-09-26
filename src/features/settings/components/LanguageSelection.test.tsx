import { fireEvent, screen } from '@testing-library/react-native';
import { I18nManager } from 'react-native';

import { refreshCooldownReminders } from '@/features/settings/services/reminderActions';
import { applyLanguage, DEFAULT_LANGUAGE } from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LanguageSelection } from './LanguageSelection';

jest.mock('@/db/DatabaseProvider', () => ({
  // The component only forwards this to the service, which is mocked below.
  useRepositories: () => ({}),
}));

jest.mock('@/features/settings/services/reminderActions', () => ({
  refreshCooldownReminders: jest.fn(async () => undefined),
}));

/**
 * Changing language is one tap with three consequences: the choice is stored,
 * the reminders already scheduled are rebuilt in it, and a change of layout
 * direction is announced as needing a restart. Each is asserted, as is the one
 * failure the user must hear about — the choice itself not being saved.
 *
 * The layout adapter runs for real: under test the app is laid out left to
 * right, as on a device that has not been restarted into Arabic, and
 * `I18nManager.isRTL` is replaced where a case needs the other direction.
 */

const refreshMock = jest.mocked(refreshCooldownReminders);

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  applyLanguage(DEFAULT_LANGUAGE);
});

describe('LanguageSelection', () => {
  it('names every language in itself, with the stored one selected', async () => {
    await renderWithProviders(<LanguageSelection />, { settings: { language: 'de' } });

    expect(screen.getByText('System default')).toBeTruthy();
    for (const name of ['English', 'Italiano', 'Français', 'Español', 'العربية']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getByRole('radio', { name: 'Deutsch' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('stores the language chosen, then rebuilds the pending reminders in it', async () => {
    const updateSettings = jest.fn(async () => undefined);
    await renderWithProviders(<LanguageSelection />, {
      settings: { language: 'system' },
      updateSettings,
    });

    await fireEvent.press(screen.getByText('Italiano'));

    expect(updateSettings).toHaveBeenCalledWith({ language: 'it' });
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(updateSettings.mock.invocationCallOrder[0]).toBeLessThan(
      refreshMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('does nothing for the language already chosen', async () => {
    const updateSettings = jest.fn(async () => undefined);
    await renderWithProviders(<LanguageSelection />, {
      settings: { language: 'it' },
      updateSettings,
    });

    await fireEvent.press(screen.getByText('Italiano'));

    expect(updateSettings).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('reports a choice that could not be stored, and touches nothing else', async () => {
    const forceRtl = jest.spyOn(I18nManager, 'forceRTL');
    const updateSettings = jest.fn(async () => {
      throw new Error('database is locked');
    });
    await renderWithProviders(<LanguageSelection />, { updateSettings });

    await fireEvent.press(screen.getByText('العربية'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This setting could not be saved. Please try again.',
    );
    expect(forceRtl).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('keeps quiet about reminders that could not be rebuilt', async () => {
    // The language was saved; the old reminders simply keep their old words.
    refreshMock.mockRejectedValueOnce(new Error('scheduling failed'));
    await renderWithProviders(<LanguageSelection />);

    await fireEvent.press(screen.getByText('Español'));

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('needs no restart between two languages written the same way', async () => {
    await renderWithProviders(<LanguageSelection />);

    await fireEvent.press(screen.getByText('Italiano'));

    expect(screen.queryByText(/Close and reopen the app/)).toBeNull();
  });

  it('says a restart is needed to lay the app out right to left', async () => {
    await renderWithProviders(<LanguageSelection />);

    await fireEvent.press(screen.getByText('العربية'));

    expect(screen.getByText('Close and reopen the app to lay it out right to left.')).toBeTruthy();
  });

  it('says a restart is needed to go back to left to right', async () => {
    // Launched in Arabic, so the running layout is still mirrored.
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await renderWithProviders(<LanguageSelection />, { settings: { language: 'ar' } });

    await fireEvent.press(screen.getByText('English'));

    expect(screen.getByText('Close and reopen the app to lay it out left to right.')).toBeTruthy();
  });
});

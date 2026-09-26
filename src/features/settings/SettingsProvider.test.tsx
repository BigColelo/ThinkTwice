import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';

import { invalidate, resetRevisionsForTesting } from '@/db/dataRevisions';
import type { SettingsUpdate } from '@/db/repositories';
import type { AppSettings } from '@/types/domain';

import { FALLBACK_SETTINGS, SettingsProvider, useSettings } from './SettingsProvider';

/**
 * The provider holds the one copy of the settings every screen reads, so it has
 * to follow the database the same way a query does. Two paths change the row:
 * `updateSettings`, which applies what it saved at once, and every other write —
 * the reset, the development seed, the reminders switch — which names
 * `settings` on the invalidation bus and relies on the provider re-reading.
 * The second path is the one that used to need a manual reload, and a reload
 * forgotten there would have left the whole app showing a row that had changed.
 */

const mockRepositories = {
  settings: {
    get: jest.fn<Promise<AppSettings>, []>(),
    update: jest.fn<Promise<AppSettings>, [SettingsUpdate]>(),
  },
};

jest.mock('@/db/DatabaseProvider', () => ({
  useRepositories: () => mockRepositories,
}));

let stored: AppSettings;

function Probe(): React.ReactElement {
  const { settings, isLoading, updateSettings } = useSettings();
  return (
    <>
      <Text testID="probe">
        {isLoading ? 'loading' : `${settings.currencyCode} ${settings.onboardingCompleted}`}
      </Text>
      <Pressable testID="update" onPress={() => void updateSettings({ currencyCode: 'CHF' })}>
        <Text>update</Text>
      </Pressable>
    </>
  );
}

function renderProvider(): ReturnType<typeof render> {
  return render(
    <SettingsProvider>
      <Probe />
    </SettingsProvider>,
  );
}

/** A read that stays in flight until the test lets it finish. */
function deferred(): { promise: Promise<AppSettings>; resolve: (value: AppSettings) => void } {
  let resolve: (value: AppSettings) => void = () => undefined;
  const promise = new Promise<AppSettings>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetRevisionsForTesting();
  stored = { ...FALLBACK_SETTINGS, currencyCode: 'EUR', onboardingCompleted: true };
  mockRepositories.settings.get.mockImplementation(async () => ({ ...stored }));
  mockRepositories.settings.update.mockImplementation(async (update) => {
    stored = { ...stored, ...update };
    return { ...stored };
  });
});

describe('SettingsProvider', () => {
  it('reports loading until the stored row has been read', async () => {
    const read = deferred();
    mockRepositories.settings.get.mockReturnValueOnce(read.promise);

    await renderProvider();
    expect(screen.getByTestId('probe')).toHaveTextContent('loading');

    await act(async () => read.resolve({ ...stored }));

    expect(screen.getByTestId('probe')).toHaveTextContent('EUR true');
  });

  it('falls back to the defaults when the first read fails', async () => {
    mockRepositories.settings.get.mockRejectedValueOnce(new Error('disk I/O error'));

    await renderProvider();

    expect(await screen.findByText('EUR false')).toBeTruthy();
  });

  it('re-reads the row when a write elsewhere names settings', async () => {
    await renderProvider();
    expect(await screen.findByText('EUR true')).toBeTruthy();

    // What a reset does: it writes through a repository, not through the provider.
    stored = { ...stored, onboardingCompleted: false };
    await act(async () => invalidate('settings'));

    expect(await screen.findByText('EUR false')).toBeTruthy();
  });

  it('ignores writes that name other entities', async () => {
    await renderProvider();
    expect(await screen.findByText('EUR true')).toBeTruthy();
    const readsSoFar = mockRepositories.settings.get.mock.calls.length;

    await act(async () => invalidate('wishlist', 'purchases'));

    expect(mockRepositories.settings.get).toHaveBeenCalledTimes(readsSoFar);
  });

  it('applies an update at once, without waiting for the re-read it triggers', async () => {
    await renderProvider();
    expect(await screen.findByText('EUR true')).toBeTruthy();
    // The re-read after the write never finishes; the saved row must show anyway.
    mockRepositories.settings.get.mockReturnValue(deferred().promise);

    await fireEvent.press(screen.getByTestId('update'));

    expect(await screen.findByText('CHF true')).toBeTruthy();
    expect(mockRepositories.settings.update).toHaveBeenCalledWith({ currencyCode: 'CHF' });
  });

  it('keeps what is on screen when a re-read fails', async () => {
    await renderProvider();
    expect(await screen.findByText('EUR true')).toBeTruthy();
    mockRepositories.settings.get.mockRejectedValueOnce(new Error('database is locked'));

    await act(async () => invalidate('settings'));

    // Not the defaults, which would send an onboarded user back to onboarding.
    expect(screen.getByTestId('probe')).toHaveTextContent('EUR true');
  });

  it('never lets a slow earlier read land on top of a newer one', async () => {
    await renderProvider();
    expect(await screen.findByText('EUR true')).toBeTruthy();

    const slow = deferred();
    mockRepositories.settings.get.mockReturnValueOnce(slow.promise);
    await act(async () => invalidate('settings'));

    stored = { ...stored, currencyCode: 'CHF' };
    await act(async () => invalidate('settings'));
    expect(await screen.findByText('CHF true')).toBeTruthy();

    // The first read finishes last, with what was true before the second write.
    await act(async () => slow.resolve({ ...stored, currencyCode: 'EUR' }));

    expect(screen.getByTestId('probe')).toHaveTextContent('CHF true');
  });
});

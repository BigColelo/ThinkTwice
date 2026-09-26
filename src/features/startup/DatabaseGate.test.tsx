import { act, fireEvent, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Text } from 'react-native';

import { DatabaseProvider } from '@/db/DatabaseProvider';
import { renderWithProviders } from '@/test/renderWithProviders';

import { DatabaseGate } from './DatabaseGate';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(async () => undefined),
  preventAutoHideAsync: jest.fn(async () => undefined),
}));

/**
 * The first thing every launch passes through, and the only screen standing
 * between a database that will not open and a blank app.
 *
 * Asserted with the real provider and an injected `open`, so what is under test
 * is the whole path a user meets: waiting, failing with something they can
 * quote, and a retry that genuinely opens the database again.
 */

const fakeDatabase = { closeAsync: jest.fn(async () => undefined) } as unknown as SQLiteDatabase;

/** An open that stays in flight until the test lets it finish. */
function pendingOpen(): { open: () => Promise<SQLiteDatabase>; finish: () => void } {
  let finish: () => void = () => undefined;
  const promise = new Promise<SQLiteDatabase>((resolve) => {
    finish = () => resolve(fakeDatabase);
  });
  return { open: () => promise, finish };
}

function renderGate(open: () => Promise<SQLiteDatabase>): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <DatabaseProvider open={open}>
      <DatabaseGate>
        <Text>The app</Text>
      </DatabaseGate>
    </DatabaseProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DatabaseGate', () => {
  it('says what it is waiting for, and keeps the splash up meanwhile', async () => {
    const { open } = pendingOpen();

    await renderGate(open);

    expect(screen.getByLabelText('Opening your data')).toBeTruthy();
    expect(screen.queryByText('The app')).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('renders the app once the database is open, leaving the splash to the settings gate', async () => {
    const pending = pendingOpen();
    await renderGate(pending.open);

    await act(async () => pending.finish());

    expect(screen.getByText('The app')).toBeTruthy();
    // Dropping it here would uncover a first frame painted before the settings
    // are read, in the device's theme and language rather than the user's.
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('explains a failure, with the message the user can quote', async () => {
    await renderGate(async () => {
      throw new Error('Could not prepare the local database.');
    });

    expect(await screen.findByText('Your data could not be opened')).toBeTruthy();
    expect(screen.getByText('Could not prepare the local database.')).toBeTruthy();
    expect(screen.queryByText('The app')).toBeNull();
    // An error is something to show, so the splash must not cover it.
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('opens the database again when the user retries', async () => {
    const open = jest
      .fn<Promise<SQLiteDatabase>, []>()
      .mockRejectedValueOnce(new Error('database is locked'))
      .mockResolvedValue(fakeDatabase);
    await renderGate(open);
    expect(await screen.findByText('database is locked')).toBeTruthy();

    await fireEvent.press(screen.getByText('Try again'));

    expect(await screen.findByText('The app')).toBeTruthy();
    expect(open).toHaveBeenCalledTimes(2);
  });
});

import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { AppErrorBoundary } from './AppErrorBoundary';

/**
 * The boundary is the difference between one broken screen and a dead app, so
 * both halves are asserted: the crash screen appears in place of the tree that
 * threw, and trying again really does render that tree once more.
 */

// Read at render time, so a test can let the tree recover before retrying.
const control = { shouldThrow: true };

function Faulty(): React.ReactElement {
  if (control.shouldThrow) throw new Error('boom');
  return <Text>Recovered</Text>;
}

beforeEach(() => {
  control.shouldThrow = true;
  // React reports every caught error on the console; here that is the point.
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AppErrorBoundary', () => {
  it('renders its children while nothing is wrong', async () => {
    control.shouldThrow = false;

    await renderWithProviders(
      <AppErrorBoundary>
        <Faulty />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Recovered')).toBeTruthy();
  });

  it('replaces a tree that throws with the crash screen, message included', async () => {
    await renderWithProviders(
      <AppErrorBoundary>
        <Faulty />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('This screen ran into a problem')).toBeTruthy();
    expect(screen.getByText('boom')).toBeTruthy();
    expect(screen.queryByText('Recovered')).toBeNull();
  });

  it('re-mounts the tree when the user tries again', async () => {
    await renderWithProviders(
      <AppErrorBoundary>
        <Faulty />
      </AppErrorBoundary>,
    );
    control.shouldThrow = false;

    await fireEvent.press(screen.getByText('Try again'));

    expect(screen.getByText('Recovered')).toBeTruthy();
    expect(screen.queryByText('This screen ran into a problem')).toBeNull();
  });

  it('shows the crash screen in the language of the provider above it', async () => {
    await renderWithProviders(
      <AppErrorBoundary>
        <Faulty />
      </AppErrorBoundary>,
      { language: 'it' },
    );

    expect(screen.getByText('Questa schermata ha riscontrato un problema')).toBeTruthy();
    expect(screen.getByText('Riprova')).toBeTruthy();
  });
});

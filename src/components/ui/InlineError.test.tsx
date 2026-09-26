import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { InlineError } from './InlineError';

/**
 * Every failure message in the app goes through this, so what is asserted is
 * what every one of them relies on: it is announced, and it is absent — not an
 * empty line taking up space — when there is nothing to say.
 */

describe('InlineError', () => {
  it('announces the message as an alert', async () => {
    await renderWithProviders(<InlineError message="The purchase could not be saved." />);

    expect(screen.getByRole('alert')).toHaveTextContent('The purchase could not be saved.');
  });

  it.each([null, undefined, ''])('renders nothing for %p', async (message) => {
    await renderWithProviders(<InlineError message={message} spaceAbove="sm" />);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});

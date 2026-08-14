import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { AboutCard } from './AboutCard';

/**
 * The About card.
 *
 * Two numbers could be mistaken for each other in Settings — the app version here
 * and the database schema version under Data — so this one says which it is, and
 * says nothing at all when there is no manifest to read it from.
 */

describe('AboutCard', () => {
  it('names the app and the version running', async () => {
    await renderWithProviders(<AboutCard version="1.0.0" />);

    expect(screen.getByText('ThinkTwice')).toBeTruthy();
    expect(screen.getByText('Version 1.0.0')).toBeTruthy();
  });

  it('leaves the line out rather than showing an unknown version', async () => {
    await renderWithProviders(<AboutCard version={null} />);

    expect(screen.getByText('ThinkTwice')).toBeTruthy();
    expect(screen.queryByText(/^Version/)).toBeNull();
    expect(screen.queryByText(/unknown/i)).toBeNull();
  });

  it('says what the app is for, and what it does not do', async () => {
    await renderWithProviders(<AboutCard version="1.0.0" />);

    expect(screen.getByText(/It never tells you what to buy/)).toBeTruthy();
  });
});

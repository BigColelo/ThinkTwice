import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { WishlistNotesCard } from './WishlistNotesCard';

/** The user's own reason, shown back verbatim — nothing added, nothing trimmed. */

describe('WishlistNotesCard', () => {
  it('shows the note exactly as written', async () => {
    const notes = 'For the trip in May.\nThe old one lost its autofocus.';

    await renderWithProviders(<WishlistNotesCard notes={notes} />);

    expect(screen.getByText(notes)).toBeTruthy();
  });
});

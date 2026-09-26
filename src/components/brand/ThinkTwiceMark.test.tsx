import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ThinkTwiceWordmark } from './ThinkTwiceMark';

/**
 * The name is two pieces of text in a row. Under a right-to-left layout an
 * unpinned row would read "TwiceThink", so what is asserted is that the row is
 * pinned left to right — and that it hugs its text, so the name still starts
 * where a line starts.
 */

describe('ThinkTwiceWordmark', () => {
  it('reads "ThinkTwice" in every layout direction, from the start of the line', async () => {
    await renderWithProviders(<ThinkTwiceWordmark />, { language: 'ar' });

    const row = screen.getByLabelText('ThinkTwice');
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({
      flexDirection: 'row',
      direction: 'ltr',
      alignSelf: 'flex-start',
    });
    expect(row).toHaveTextContent('ThinkTwice');
  });
});

import { screen, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ItemImage } from './ItemImage';

/**
 * The hero photo on a detail screen.
 *
 * A stored URI is not a guarantee that a file is still there, so the case that
 * matters is the one nobody sees coming: the band must disappear rather than hold
 * two hundred points of empty space where a picture used to be.
 */

const PHOTO = 'file:///images/camera.jpg';

describe('ItemImage', () => {
  it('renders the photo when there is one', async () => {
    await renderWithProviders(<ItemImage uri={PHOTO} testID="hero" />);

    expect(screen.getByTestId('hero')).toBeTruthy();
  });

  it('renders nothing at all without a photo', async () => {
    await renderWithProviders(<ItemImage uri={null} testID="hero" />);

    // The image is the band's only child, so its absence is the band's absence.
    expect(screen.queryByTestId('hero')).toBeNull();
  });

  it('collapses when the file behind the URI has gone', async () => {
    await renderWithProviders(<ItemImage uri={PHOTO} testID="hero" />);

    await fireEvent(screen.getByTestId('hero'), 'error', {
      nativeEvent: { error: 'file not found' },
    });

    expect(screen.queryByTestId('hero')).toBeNull();
  });

  it('stays collapsed rather than retrying on every render', async () => {
    const view = await renderWithProviders(<ItemImage uri={PHOTO} testID="hero" />);

    await fireEvent(screen.getByTestId('hero'), 'error', {
      nativeEvent: { error: 'file not found' },
    });
    view.rerender(<ItemImage uri={PHOTO} testID="hero" />);

    expect(screen.queryByTestId('hero')).toBeNull();
  });
});

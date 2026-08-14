import { screen, fireEvent } from '@testing-library/react-native';
import { Camera } from 'lucide-react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { Thumbnail } from './Thumbnail';

/**
 * The photo in a list row.
 *
 * Unlike the hero image, this one keeps its square whatever happens — collapsing
 * would pull the row it sits in out of alignment — so a missing or unreadable
 * photo falls back to the category icon rather than to nothing.
 *
 * That fallback is decorative, and the queries below prove it: the frame is
 * reachable only with `includeHiddenElements`, because it is hidden from
 * assistive technology. The row around it carries the label.
 */

const PHOTO = 'file:///images/camera.jpg';
// A fresh object per call: expo-image defines a property on the payload it receives,
// and doing that twice to the same object throws.
const errorEvent = (): { nativeEvent: { error: string } } => ({
  nativeEvent: { error: 'file not found' },
});
const withHidden = { includeHiddenElements: true } as const;

function render(uri: string | null) {
  return renderWithProviders(
    <Thumbnail uri={uri} fallbackIcon={Camera} tint="orange" testID="thumb" />,
  );
}

describe('Thumbnail', () => {
  it('shows the photo when there is one', async () => {
    await render(PHOTO);

    expect(screen.getByTestId('thumb-image')).toBeTruthy();
  });

  it('keeps its frame and falls back to the icon without a photo', async () => {
    await render(null);

    expect(screen.getByTestId('thumb', withHidden)).toBeTruthy();
    expect(screen.queryByTestId('thumb-image', withHidden)).toBeNull();
  });

  it('falls back when the file behind the URI has gone', async () => {
    await render(PHOTO);

    await fireEvent(screen.getByTestId('thumb-image'), 'error', errorEvent());

    expect(screen.getByTestId('thumb', withHidden)).toBeTruthy();
    expect(screen.queryByTestId('thumb-image', withHidden)).toBeNull();
  });

  it('does not retry a photo that already failed', async () => {
    const view = await render(PHOTO);

    await fireEvent(screen.getByTestId('thumb-image'), 'error', errorEvent());
    view.rerender(<Thumbnail uri={PHOTO} fallbackIcon={Camera} tint="orange" testID="thumb" />);

    expect(screen.queryByTestId('thumb-image', withHidden)).toBeNull();
  });

  it('hides the decorative fallback from screen readers', async () => {
    await render(null);

    // Not found without opting into hidden elements — which is the point.
    expect(screen.queryByTestId('thumb')).toBeNull();

    // Both halves of the same intent, since each platform reads a different one:
    // the query above passes with only the Android prop, so both are asserted.
    const frame = screen.getByTestId('thumb', withHidden);
    expect(frame.props.accessibilityElementsHidden).toBe(true);
    expect(frame.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('leaves a real photo in the tree, since the row labels it', async () => {
    await render(PHOTO);

    expect(screen.queryByTestId('thumb')).not.toBeNull();
  });
});

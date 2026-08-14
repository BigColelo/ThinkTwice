import { fireEvent, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { IntroCarousel, PAGER_TEST_ID } from './IntroCarousel';

/**
 * The slides can be moved two ways — swiping the pager and pressing the button —
 * and the whole point of the carousel is that those two stay in agreement. These
 * cover that, and the promise the dots make: three pages, and the last one ends
 * the introduction.
 */

const { width } = Dimensions.get('window');

async function swipeTo(page: number): Promise<void> {
  await fireEvent.scroll(screen.getByTestId(PAGER_TEST_ID), {
    nativeEvent: {
      contentOffset: { x: page * width, y: 0 },
      contentSize: { width: width * 3, height: 600 },
      layoutMeasurement: { width, height: 600 },
    },
  });
}

describe('IntroCarousel', () => {
  it('starts on the first slide and shows every slide to a screen reader', async () => {
    await renderWithProviders(<IntroCarousel onDone={jest.fn()} />);

    expect(screen.getByLabelText('Step 1 of 3')).toBeTruthy();
    expect(screen.getByText('Buy better.\nLive better.')).toBeTruthy();
    expect(screen.getByText('Think before\nyou buy.')).toBeTruthy();
    expect(screen.getByText('Know the\nreal cost.')).toBeTruthy();
  });

  it('advances with the button', async () => {
    await renderWithProviders(<IntroCarousel onDone={jest.fn()} />);

    await fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByLabelText('Step 2 of 3')).toBeTruthy();

    await fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByLabelText('Step 3 of 3')).toBeTruthy();
  });

  it('follows a swipe, so the dots and the button agree with the pager', async () => {
    await renderWithProviders(<IntroCarousel onDone={jest.fn()} />);

    await swipeTo(1);
    expect(screen.getByLabelText('Step 2 of 3')).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();

    await swipeTo(2);
    expect(screen.getByLabelText('Step 3 of 3')).toBeTruthy();
    // The last slide offers to leave, not to advance into nothing.
    expect(screen.getByText('Get started')).toBeTruthy();
    expect(screen.queryByText('Continue')).toBeNull();
  });

  it('leaves the introduction from the last slide', async () => {
    const onDone = jest.fn();
    await renderWithProviders(<IntroCarousel onDone={onDone} />);

    await swipeTo(2);
    await fireEvent.press(screen.getByText('Get started'));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('lets the user skip out, but only while there is something to skip', async () => {
    const onDone = jest.fn();
    await renderWithProviders(<IntroCarousel onDone={onDone} />);

    await fireEvent.press(screen.getByLabelText('Skip introduction'));
    expect(onDone).toHaveBeenCalledTimes(1);

    // On the last slide the control is a spacer, not an invisible button: a
    // screen reader must not announce a second way out that cannot be seen.
    await swipeTo(2);
    expect(screen.queryByLabelText('Skip introduction')).toBeNull();
  });
});

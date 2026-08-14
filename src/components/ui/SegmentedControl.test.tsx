import { screen, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { sizes } from '@/theme/sizes';

import { SegmentedControl } from './SegmentedControl';

/**
 * The control behind the theme choice and the Insights range.
 *
 * Its segments are inset by the track's padding, so they are shorter than the
 * control looks — which is why the slop below is not decoration. It grows the
 * target vertically only: horizontally the segments touch, and a wider one there
 * would hand taps to the neighbour.
 */

const OPTIONS = [
  { value: 'this_year', label: 'This year' },
  { value: 'all_time', label: 'All time' },
] as const;

function render(size?: 'sm' | 'md', onChange = jest.fn()) {
  return renderWithProviders(
    <SegmentedControl
      accessibilityLabel="Time range"
      options={[...OPTIONS]}
      value="this_year"
      onChange={onChange}
      size={size}
    />,
  );
}

describe('SegmentedControl', () => {
  it.each(['sm', 'md'] as const)(
    'reaches the app minimum target height at size %s',
    async (size) => {
      await render(size);

      const segment = screen.getByLabelText('All time');
      const slop = segment.props.hitSlop as { top: number; bottom: number };
      const height = sizes.control[size] - 6;

      expect(height + slop.top + slop.bottom).toBeGreaterThanOrEqual(sizes.minTouchTarget);
      // Nothing added sideways, where the neighbour begins immediately.
      expect(slop).toEqual({ top: expect.any(Number), bottom: expect.any(Number) });
    },
  );

  it('announces which segment is selected', async () => {
    await render();

    expect(screen.getByLabelText('This year').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('All time').props.accessibilityState.selected).toBe(false);
  });

  it('reports the value the user picked', async () => {
    const onChange = jest.fn();
    await render('sm', onChange);

    await fireEvent.press(screen.getByLabelText('All time'));

    expect(onChange).toHaveBeenCalledWith('all_time');
  });
});

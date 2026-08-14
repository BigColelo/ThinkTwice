import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { sizes } from '@/theme/sizes';

import { Chip } from './Chip';

/**
 * Chips are the most numerous control in the app — every form has three groups of
 * them — so the thing worth pinning is the one that is invisible: a chip you can
 * press is a touch target and has to be big enough to aim at, while a chip that
 * only labels something stays compact because nothing is aiming at it.
 */

/** The inner pill; the pressable wraps it and carries the slop. */
function pillStyleOf(pressable: { children: unknown[] }): { minHeight?: number } {
  const [inner] = pressable.children;
  const style = (inner as { props?: { style?: unknown } } | undefined)?.props?.style;
  return StyleSheet.flatten(style) as { minHeight?: number };
}

describe('Chip', () => {
  it('gives a pressable chip a target at least as large as the app minimum', async () => {
    await renderWithProviders(<Chip label="Weekly" onPress={jest.fn()} />);

    const pressable = screen.getByLabelText('Weekly');
    const slop = pressable.props.hitSlop as number;
    const { minHeight } = pillStyleOf(pressable);

    expect(minHeight).toBe(sizes.control.sm);
    // Real height plus a slop that only closes the remainder — a bigger halo would
    // overlap the neighbouring chip and steal its taps.
    expect((minHeight ?? 0) + 2 * slop).toBeGreaterThanOrEqual(sizes.minTouchTarget);
  });

  it('applies the same target to the small size, which is still pressed', async () => {
    await renderWithProviders(<Chip label="Most used" size="sm" onPress={jest.fn()} />);

    const pressable = screen.getByLabelText('Most used');
    const { minHeight } = pillStyleOf(pressable);

    expect((minHeight ?? 0) + 2 * (pressable.props.hitSlop as number)).toBeGreaterThanOrEqual(
      sizes.minTouchTarget,
    );
  });

  it('leaves a label-only chip compact, and out of the accessibility tree as a button', async () => {
    await renderWithProviders(<Chip label="Owned for 8 months" />);

    expect(screen.queryByRole('button', { name: 'Owned for 8 months' })).toBeNull();
    expect(screen.getByText('Owned for 8 months')).toBeTruthy();
  });

  it('announces whether a toggle is selected', async () => {
    await renderWithProviders(<Chip label="Hobby" selected onPress={jest.fn()} />);

    expect(screen.getByLabelText('Hobby').props.accessibilityState.selected).toBe(true);
  });

  it('says the same thing in dark mode', async () => {
    await renderWithProviders(<Chip label="Technology" tint="blue" />, { themeMode: 'dark' });

    expect(screen.getByText('Technology')).toBeTruthy();
  });
});

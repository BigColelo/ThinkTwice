import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

/**
 * A single-choice control for short option sets — theme mode, insights range,
 * expense type. Selection is shown by both fill and text weight, never by
 * colour alone.
 */

/** The track's inset around each segment, and the gap between them. */
const TRACK_PADDING = 3;

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Screen-reader label for the group, e.g. "Appearance". */
  accessibilityLabel?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  size = 'md',
  style,
}: SegmentedControlProps<T>): React.ReactElement {
  const theme = useTheme();
  const height = size === 'sm' ? theme.sizes.control.sm : theme.sizes.control.md;

  // The track insets every segment by this much, top and bottom, which is what
  // leaves room for the selected one to sit inside it.
  const segmentHeight = height - TRACK_PADDING * 2;

  // The slop is vertical only: horizontally the segments touch, and widening them
  // there would hand taps to the neighbour.
  const verticalSlop = Math.max(0, (theme.sizes.minTouchTarget - segmentHeight) / 2);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radius.md,
          padding: TRACK_PADDING,
          gap: TRACK_PADDING,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected, checked: isSelected }}
            onPress={() => onChange(option.value)}
            hitSlop={{ top: verticalSlop, bottom: verticalSlop }}
            style={({ pressed }) => [
              {
                flex: 1,
                height: segmentHeight,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radius.sm,
                backgroundColor: isSelected ? theme.colors.surface : 'transparent',
                ...(isSelected ? theme.elevation('card') : {}),
              },
              pressed && !isSelected ? { opacity: 0.6 } : null,
            ]}
          >
            <AppText
              variant={isSelected ? 'subheading' : 'label'}
              color={isSelected ? 'primary' : 'secondary'}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

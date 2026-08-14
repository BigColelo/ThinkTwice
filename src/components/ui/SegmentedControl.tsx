import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

/**
 * A single-choice control for short option sets — theme mode, insights range,
 * expense type. Selection is shown by both fill and text weight, never by
 * colour alone.
 */

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

  // Segments are inset by the track's padding, so the visible one is shorter than
  // the control. The slop is vertical only: horizontally the segments touch, and
  // widening them there would hand taps to the neighbour.
  const verticalSlop = Math.max(0, (theme.sizes.minTouchTarget - (height - 6)) / 2);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radius.md,
          padding: 3,
          gap: 3,
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
                height: height - 6,
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

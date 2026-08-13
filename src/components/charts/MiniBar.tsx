import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { clamp } from '@/utils/numbers';

/**
 * A single proportional bar. Used inline wherever a share needs a visual cue —
 * always alongside the figure it represents, never instead of it.
 */

export type MiniBarProps = {
  /** 0–1. Clamped. */
  fraction: number;
  color?: string;
  trackColor?: string;
  height?: number;
  /** Describes the value for screen readers; omit when a sibling already does. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function MiniBar({
  fraction,
  color,
  trackColor,
  height = 6,
  accessibilityLabel,
  style,
}: MiniBarProps): React.ReactElement {
  const theme = useTheme();
  const safeFraction = clamp(Number.isFinite(fraction) ? fraction : 0, 0, 1);

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[
        {
          height,
          borderRadius: theme.radius.full,
          backgroundColor: trackColor ?? theme.colors.surfaceMuted,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${safeFraction * 100}%`,
          height: '100%',
          borderRadius: theme.radius.full,
          backgroundColor: color ?? theme.colors.accent.base,
        }}
      />
    </View>
  );
}

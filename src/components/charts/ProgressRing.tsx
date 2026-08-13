import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/theme';
import { clamp } from '@/utils/numbers';

/**
 * A circular progress indicator.
 *
 * Built on `react-native-svg` rather than a charting library: the app needs
 * exactly this, a couple of bars, and nothing else. A stroked arc is a handful
 * of lines and stays fully under our control in both themes.
 *
 * Used for the cooldown countdown and the "% of monthly income" summary.
 */

export type ProgressRingProps = {
  /** 0–1. Values outside the range are clamped. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Content rendered in the middle, e.g. a percentage. */
  children?: React.ReactNode;
  /** Describes the value for screen readers, e.g. "6 of 7 days remaining". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ProgressRing({
  progress,
  size = 56,
  strokeWidth = 5,
  color,
  trackColor,
  children,
  accessibilityLabel,
  style,
}: ProgressRingProps): React.ReactElement {
  const theme = useTheme();

  const safeProgress = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={
        accessibilityLabel ? { min: 0, max: 100, now: Math.round(safeProgress * 100) } : undefined
      }
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      {/* The canvas is rotated so the arc starts at 12 o'clock rather than 3. */}
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <G>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor ?? theme.colors.surfaceMuted}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color ?? theme.colors.accent.base}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - safeProgress)}
          />
        </G>
      </Svg>
      {children}
    </View>
  );
}

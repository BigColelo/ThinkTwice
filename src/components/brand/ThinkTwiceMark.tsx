import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme';

/**
 * The ThinkTwice mark: the same shopping-bag geometry as the app icon, drawn as
 * vectors so it stays crisp at any size and follows the active theme.
 *
 * Nothing here is imported artwork — the shape is defined in this file, which
 * is what keeps the project reproducible from source alone.
 */

export function ThinkTwiceMark({ size = 96 }: { size?: number }): React.ReactElement {
  const theme = useTheme();

  // Geometry expressed on a 100×100 canvas, mirroring scripts/generate-app-icons.js.
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image">
      <Path
        d="M 37.5 44 A 12.5 12.5 0 0 1 62.5 44"
        stroke={theme.colors.accent.base}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x="26.5" y="41" width="47" height="45" rx="12" fill={theme.colors.accent.base} />
    </Svg>
  );
}

/** The wordmark: "Think" in the text colour, "Twice" in the accent. */
export function ThinkTwiceWordmark(): React.ReactElement {
  const theme = useTheme();

  return (
    <View accessible accessibilityLabel="ThinkTwice" style={{ flexDirection: 'row' }}>
      <AppText variant="title">Think</AppText>
      <AppText variant="title" style={{ color: theme.colors.accent.base }}>
        Twice
      </AppText>
    </View>
  );
}

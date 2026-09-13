import React from 'react';
import { View } from 'react-native';

import { useTheme, type SpacingKey } from '@/theme';

/**
 * Vertical space between two blocks of a screen.
 *
 * Screens are written as a sequence of sections, and the gap between them
 * varies — a section header sits closer to its own card than two sections sit
 * to each other — so a single `gap` on the scroll container cannot express it.
 * What was there instead was the same four-line `<View style={{ height:
 * theme.spacing.xl }} />` forty times over, which reads as layout and is really
 * punctuation.
 *
 * Horizontal space is deliberately not offered: every row in the app uses `gap`
 * on its own flex container, which stays correct under a right-to-left layout
 * where a fixed-width spacer would not.
 */
export function Spacer({ size }: { size: SpacingKey }): React.ReactElement {
  const theme = useTheme();
  return <View style={{ height: theme.spacing[size] }} />;
}

import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StatusBar as SystemStatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/**
 * What surrounds every screen: the page colour, and the accent behind the
 * status bar.
 */
export function AppChrome({ children }: { children: React.ReactNode }): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* The strip behind the status bar is the app's accent, in both schemes: it
          is the one piece of chrome present on every screen, so it carries the
          brand instead of each screen painting its own top edge. Owning it here
          is also why no screen adds the top inset itself. */}
      <View style={{ height: insets.top, backgroundColor: theme.colors.accent.base }} />

      {/* Always light: the icons sit on the accent, never on the page. */}
      <StatusBar style="light" />
      {/* The same accent, handed to the system instead of painted, for the
          platforms that do not lay the app out behind the status bar: there the
          top inset is zero, so the strip above collapses and the brand would
          simply vanish. The two never both apply — this prop is ignored from
          Android 15 on, which is exactly where edge-to-edge makes the strip
          real. */}
      <SystemStatusBar backgroundColor={theme.colors.accent.base} />
      {children}
    </View>
  );
}

import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

/**
 * The "Thinking about" / "Recent purchases" heading, optionally with a trailing
 * text action ("See all", "Edit") on the right.
 */

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
    accessibilityHint?: string;
  };
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({
  title,
  subtitle,
  action,
  style,
}: SectionHeaderProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.sm,
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityHint={action.accessibilityHint}
          onPress={action.onPress}
          hitSlop={theme.spacing.sm}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <AppText variant="label" color="accent">
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

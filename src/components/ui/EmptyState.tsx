import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

/**
 * Shown wherever there is genuinely nothing to display. ThinkTwice is empty on
 * day one by design, so these states carry real weight: each says what the
 * screen will show and offers the action that fills it.
 */

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  style,
}: EmptyStateProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          paddingVertical: compact ? theme.spacing.lg : theme.spacing.xxl,
          paddingHorizontal: theme.spacing.md,
        },
        style,
      ]}
    >
      <View
        style={{
          width: compact ? 44 : 56,
          height: compact ? 44 : 56,
          borderRadius: theme.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceMuted,
          marginBottom: theme.spacing.sm,
        }}
      >
        <Icon
          size={compact ? theme.sizes.icon.md : theme.sizes.icon.lg}
          color={theme.colors.text.tertiary}
          strokeWidth={theme.sizes.iconStrokeWidth}
        />
      </View>

      <AppText variant={compact ? 'subheading' : 'heading'} align="center">
        {title}
      </AppText>
      <AppText
        variant="body"
        color="secondary"
        align="center"
        style={{ marginTop: theme.spacing.xxs, maxWidth: 320 }}
      >
        {description}
      </AppText>

      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="secondary"
          size="md"
          fullWidth={false}
          style={{ marginTop: theme.spacing.md }}
        />
      ) : null}
    </View>
  );
}

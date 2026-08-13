import { TriangleAlert } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

/**
 * Loading and error presentations shared by every screen, so a slow read and a
 * failed read always look the same wherever they happen.
 */

export function LoadingState({
  label = 'Loading',
  style,
}: {
  label?: string;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[{ paddingVertical: theme.spacing.xxl, alignItems: 'center' }, style]}
    >
      <ActivityIndicator color={theme.colors.accent.base} />
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  style,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          paddingVertical: theme.spacing.xxl,
          paddingHorizontal: theme.spacing.md,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: theme.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.danger.soft,
          marginBottom: theme.spacing.sm,
        }}
      >
        <TriangleAlert
          size={theme.sizes.icon.lg}
          color={theme.colors.danger.base}
          strokeWidth={theme.sizes.iconStrokeWidth}
        />
      </View>

      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {description ? (
        <AppText
          variant="body"
          color="secondary"
          align="center"
          style={{ marginTop: theme.spacing.xxs, maxWidth: 320 }}
        >
          {description}
        </AppText>
      ) : null}

      {onRetry ? (
        <Button
          label="Try again"
          onPress={onRetry}
          variant="secondary"
          size="md"
          fullWidth={false}
          style={{ marginTop: theme.spacing.md }}
        />
      ) : null}
    </View>
  );
}

/** A neutral placeholder block used while a value is still being read. */
export function Skeleton({
  width,
  height = 16,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.skeleton,
        },
        style,
      ]}
    />
  );
}

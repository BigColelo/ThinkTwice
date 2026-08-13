import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { AppText, type TextColor } from './AppText';

/**
 * The app's button. Four intents cover every action in ThinkTwice:
 * the purple primary CTA, a bordered secondary, a plain text button, and a
 * destructive variant for irreversible actions.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'leading' | 'trailing';
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  iconPosition = 'leading',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps): React.ReactElement {
  const theme = useTheme();
  const isDisabled = Boolean(disabled) || loading;

  const height = theme.sizes.control[size];
  const iconSize = size === 'sm' ? theme.sizes.icon.sm : theme.sizes.icon.md;

  const { container, textColor, iconColor } = resolveVariant(theme, variant, isDisabled);

  const content = (
    <>
      {Icon && iconPosition === 'leading' ? (
        <Icon size={iconSize} color={iconColor} strokeWidth={theme.sizes.iconStrokeWidth} />
      ) : null}
      <AppText variant="button" color={textColor}>
        {label}
      </AppText>
      {Icon && iconPosition === 'trailing' ? (
        <Icon size={iconSize} color={iconColor} strokeWidth={theme.sizes.iconStrokeWidth} />
      ) : null}
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: height,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.xs,
          paddingHorizontal: size === 'sm' ? theme.spacing.sm : theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.radius.lg,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        container,
        pressed && !isDisabled ? { opacity: 0.85, transform: [{ scale: 0.99 }] } : null,
        style,
      ]}
    >
      {loading ? (
        // The spinner replaces the content but the button keeps its size, so the
        // layout does not jump while a save is in flight.
        <View style={{ position: 'absolute' }}>
          <ActivityIndicator color={iconColor} />
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          opacity: loading ? 0 : 1,
        }}
      >
        {content}
      </View>
    </Pressable>
  );
}

function resolveVariant(
  theme: ReturnType<typeof useTheme>,
  variant: ButtonVariant,
  isDisabled: boolean,
): { container: ViewStyle; textColor: TextColor; iconColor: string } {
  const disabledOpacity = isDisabled ? 0.45 : 1;

  switch (variant) {
    case 'primary':
      return {
        container: { backgroundColor: theme.colors.accent.base, opacity: disabledOpacity },
        textColor: 'onAccent',
        iconColor: theme.colors.text.onAccent,
      };
    case 'secondary':
      return {
        container: {
          backgroundColor: theme.colors.surface,
          borderWidth: theme.sizes.hairline,
          borderColor: theme.colors.borderStrong,
          opacity: disabledOpacity,
        },
        textColor: 'primary',
        iconColor: theme.colors.text.primary,
      };
    case 'ghost':
      return {
        container: { backgroundColor: 'transparent', opacity: disabledOpacity },
        textColor: 'accent',
        iconColor: theme.colors.accent.base,
      };
    case 'destructive':
      return {
        container: {
          backgroundColor: theme.colors.danger.soft,
          opacity: disabledOpacity,
        },
        textColor: 'danger',
        iconColor: theme.colors.danger.base,
      };
  }
}

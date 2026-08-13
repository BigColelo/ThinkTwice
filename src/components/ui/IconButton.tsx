import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * An icon-only control. `accessibilityLabel` is required rather than optional:
 * an unlabelled icon button is invisible to a screen reader, and this is the
 * component most likely to be used without one.
 */

export type IconButtonVariant = 'plain' | 'surface' | 'accent' | 'muted';

export type IconButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  icon: LucideIcon;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md';
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon: Icon,
  accessibilityLabel,
  variant = 'plain',
  size = 'md',
  color,
  style,
  disabled,
  ...rest
}: IconButtonProps): React.ReactElement {
  const theme = useTheme();

  const box = size === 'sm' ? theme.sizes.control.sm : theme.sizes.control.md;
  const iconSize = size === 'sm' ? theme.sizes.icon.md : theme.sizes.icon.lg;
  const { container, iconColor } = resolveVariant(theme, variant);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      // Keeps the tappable area at the accessible minimum even for a small glyph.
      hitSlop={Math.max(0, (theme.sizes.minTouchTarget - box) / 2)}
      {...rest}
      style={({ pressed }) => [
        {
          width: box,
          height: box,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.full,
        },
        container,
        disabled ? { opacity: 0.4 } : null,
        pressed && !disabled ? { opacity: 0.6 } : null,
        style,
      ]}
    >
      <Icon size={iconSize} color={color ?? iconColor} strokeWidth={theme.sizes.iconStrokeWidth} />
    </Pressable>
  );
}

function resolveVariant(
  theme: ReturnType<typeof useTheme>,
  variant: IconButtonVariant,
): { container: ViewStyle; iconColor: string } {
  switch (variant) {
    case 'plain':
      return { container: {}, iconColor: theme.colors.text.primary };
    case 'surface':
      return {
        container: {
          backgroundColor: theme.colors.surface,
          borderWidth: theme.isDark ? theme.sizes.hairline : 0,
          borderColor: theme.colors.border,
          ...theme.elevation('card'),
        },
        iconColor: theme.colors.text.primary,
      };
    case 'muted':
      return {
        container: { backgroundColor: theme.colors.surfaceMuted },
        iconColor: theme.colors.text.secondary,
      };
    case 'accent':
      return {
        container: { backgroundColor: theme.colors.accent.base },
        iconColor: theme.colors.text.onAccent,
      };
  }
}

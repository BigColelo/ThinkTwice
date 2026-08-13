import React from 'react';
import {
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

/**
 * The app's primary surface. In light mode it is a white panel with a soft
 * shadow; in dark mode a lighter-than-background panel with a border, because
 * shadows do not read against near-black.
 */

export type CardVariant =
  /** Default panel. */
  | 'surface'
  /** Nested panel sitting on top of another card. */
  | 'muted'
  /** Accent-tinted panel, used for selected options and the cooldown card. */
  | 'accent'
  /** Border only, no fill — used for "add" affordances. */
  | 'outline';

export type CardProps = ViewProps & {
  variant?: CardVariant;
  padded?: boolean;
  /** Overrides the default padding when `padded` is true. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function Card({
  variant = 'surface',
  padded = true,
  padding,
  style,
  children,
  ...rest
}: CardProps): React.ReactElement {
  const cardStyle = useCardStyle(variant, padded, padding);
  return (
    <View {...rest} style={[cardStyle, style]}>
      {children}
    </View>
  );
}

export type PressableCardProps = Omit<PressableProps, 'style'> & {
  variant?: CardVariant;
  padded?: boolean;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/** A card that behaves as a button. Keeps the pressed state consistent app-wide. */
export function PressableCard({
  variant = 'surface',
  padded = true,
  padding,
  style,
  children,
  ...rest
}: PressableCardProps): React.ReactElement {
  const cardStyle = useCardStyle(variant, padded, padding);

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [cardStyle, pressed ? { opacity: 0.85 } : null, style]}
    >
      {children}
    </Pressable>
  );
}

function useCardStyle(variant: CardVariant, padded: boolean, padding?: number): ViewStyle {
  const theme = useTheme();

  const base: ViewStyle = {
    borderRadius: theme.radius.xl,
    padding: padded ? (padding ?? theme.spacing.md) : 0,
  };

  switch (variant) {
    case 'surface':
      return {
        ...base,
        backgroundColor: theme.colors.surface,
        borderWidth: theme.isDark ? theme.sizes.hairline : 0,
        borderColor: theme.colors.border,
        ...theme.elevation('card'),
      };
    case 'muted':
      return {
        ...base,
        backgroundColor: theme.colors.surfaceMuted,
      };
    case 'accent':
      return {
        ...base,
        backgroundColor: theme.colors.accent.soft,
        borderWidth: theme.sizes.hairline,
        borderColor: theme.colors.accent.border,
      };
    case 'outline':
      return {
        ...base,
        backgroundColor: 'transparent',
        borderWidth: theme.sizes.hairline,
        borderColor: theme.colors.border,
      };
  }
}

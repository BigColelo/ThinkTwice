import React from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { useLanguage, writesInConnectedScript } from '@/i18n';
import { useTheme, type TypographyRole } from '@/theme';

/**
 * Every piece of text in ThinkTwice goes through here.
 *
 * It binds a typographic role to a semantic colour and caps OS font scaling per
 * role, so a large-text setting enlarges body copy generously while keeping
 * side-by-side metric rows from collapsing. In a language whose script joins
 * its letters the role's tracking is dropped, for the reason given at
 * `writesInConnectedScript`.
 */

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'accent'
  | 'onAccent'
  | 'positive'
  | 'warning'
  | 'danger'
  | 'info';

export type AppTextProps = Omit<TextProps, 'style'> & {
  variant?: TypographyRole;
  color?: TextColor;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
};

export function AppText({
  variant = 'body',
  color = 'primary',
  align,
  style,
  children,
  ...rest
}: AppTextProps): React.ReactElement {
  const theme = useTheme();
  const untracked = writesInConnectedScript(useLanguage());

  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={theme.maxFontSizeMultiplier[variant]}
      {...rest}
      style={[
        theme.typography[variant],
        untracked ? UNTRACKED : null,
        { color: resolveColor(theme.colors, color) },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const UNTRACKED: TextStyle = { letterSpacing: 0 };

function resolveColor(colors: ReturnType<typeof useTheme>['colors'], color: TextColor): string {
  switch (color) {
    case 'primary':
      return colors.text.primary;
    case 'secondary':
      return colors.text.secondary;
    case 'tertiary':
      return colors.text.tertiary;
    case 'inverse':
      return colors.text.inverse;
    case 'onAccent':
      return colors.text.onAccent;
    case 'accent':
      return colors.accent.base;
    case 'positive':
      return colors.positive.base;
    case 'warning':
      return colors.warning.base;
    case 'danger':
      return colors.danger.base;
    case 'info':
      return colors.info.base;
  }
}

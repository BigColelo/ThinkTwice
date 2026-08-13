import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, useColorScheme, type ViewStyle } from 'react-native';

import type { ThemeMode } from '@/types/domain';

import { darkColors, lightColors, resolveTint, type ColorScheme } from './colors';
import type { TintName } from './palette';
import { radius, type Radius } from './radius';
import { elevation, type ElevationLevel } from './shadows';
import { sizes, type Sizes } from './sizes';
import { screenPadding, spacing, type Spacing } from './spacing';
import { maxFontSizeMultiplier, typography, type Typography } from './typography';

export type Theme = {
  isDark: boolean;
  colors: ColorScheme;
  spacing: Spacing;
  screenPadding: number;
  radius: Radius;
  typography: Typography;
  maxFontSizeMultiplier: typeof maxFontSizeMultiplier;
  sizes: Sizes;
  /** Returns platform-correct shadow/border styling for the active scheme. */
  elevation: (level: ElevationLevel) => ViewStyle;
  /** Resolves a category tint against the active scheme. */
  tint: (name: TintName) => { base: string; soft: string };
};

const ThemeContext = createContext<Theme | null>(null);

function buildTheme(isDark: boolean): Theme {
  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
    spacing,
    screenPadding,
    radius,
    typography,
    maxFontSizeMultiplier,
    sizes,
    elevation: (level) => elevation(level, isDark),
    tint: (name) => resolveTint(name, isDark),
  };
}

const lightTheme = buildTheme(false);
const darkTheme = buildTheme(true);

export type ThemeProviderProps = {
  /** User preference. `system` follows the OS. */
  mode: ThemeMode;
  children: React.ReactNode;
};

export function ThemeProvider({ mode, children }: ThemeProviderProps): React.ReactElement {
  const systemScheme = useColorScheme();
  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside a <ThemeProvider>.');
  }
  return theme;
}

/**
 * Builds a `StyleSheet` from the active theme and rebuilds it only when the
 * theme object identity changes (i.e. on a light/dark switch), so styles are
 * not recreated on every render.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): T {
  const theme = useTheme();
  // The factory is defined at module scope by every call site, so it is stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}

export { lightTheme, darkTheme };

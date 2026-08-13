import { amber, blue, green, neutral, purple, red, tint, type TintName } from './palette';

/**
 * Semantic colour scheme.
 *
 * Dark mode is a designed scheme, not an inversion: surfaces get *lighter* as
 * they rise, borders replace shadows, and the accent is lifted so it keeps
 * contrast against a dark background.
 */
export type ColorScheme = {
  /** Screen background, behind all cards. */
  background: string;
  /** Default card / raised surface. */
  surface: string;
  /** A surface sitting on top of `surface` (nested rows, inputs, chips). */
  surfaceMuted: string;
  /** Strongly recessed area, e.g. an image well. */
  surfaceSunken: string;
  /** Tab bar / sticky headers. */
  chrome: string;

  border: string;
  borderStrong: string;
  divider: string;

  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    onAccent: string;
  };

  accent: {
    base: string;
    pressed: string;
    soft: string;
    onSoft: string;
    border: string;
  };

  /**
   * Semantic status colours. Never used alone to convey meaning — always paired
   * with a label or icon (see `docs/architecture.md`, accessibility).
   */
  positive: StatusColor;
  warning: StatusColor;
  danger: StatusColor;
  info: StatusColor;

  /** Scrim behind modals and sheets. */
  scrim: string;
  /** Skeleton / loading placeholder fill. */
  skeleton: string;
};

export type StatusColor = {
  base: string;
  soft: string;
  onSoft: string;
};

export const lightColors: ColorScheme = {
  background: neutral[50],
  surface: neutral[0],
  surfaceMuted: neutral[100],
  surfaceSunken: neutral[100],
  chrome: neutral[0],

  border: neutral[150],
  borderStrong: neutral[200],
  divider: neutral[100],

  text: {
    primary: '#14141C',
    secondary: neutral[650],
    tertiary: neutral[550],
    inverse: neutral[0],
    onAccent: neutral[0],
  },

  accent: {
    base: purple[500],
    pressed: purple[600],
    soft: purple[50],
    onSoft: purple[600],
    border: purple[200],
  },

  positive: { base: green[500], soft: green[100], onSoft: green[600] },
  warning: { base: amber[500], soft: amber[100], onSoft: amber[600] },
  danger: { base: red[500], soft: red[100], onSoft: red[600] },
  info: { base: blue[500], soft: blue[100], onSoft: blue[600] },

  scrim: 'rgba(20, 20, 28, 0.45)',
  skeleton: neutral[100],
};

export const darkColors: ColorScheme = {
  background: neutral[1000],
  surface: neutral[900],
  surfaceMuted: neutral[850],
  surfaceSunken: neutral[950],
  chrome: neutral[950],

  border: neutral[800],
  borderStrong: neutral[750],
  divider: neutral[800],

  text: {
    primary: '#F4F4F7',
    secondary: neutral[350],
    tertiary: neutral[450],
    inverse: '#14141C',
    onAccent: '#FFFFFF',
  },

  accent: {
    base: '#7C55F5',
    pressed: '#6D3FF3',
    soft: '#241C42',
    onSoft: '#B294F8',
    border: '#3A2C6B',
  },

  positive: { base: '#3ECB86', soft: green[900], onSoft: '#6EDDA6' },
  warning: { base: '#EEB44C', soft: amber[900], onSoft: '#F5CC85' },
  danger: { base: '#F0768E', soft: red[900], onSoft: '#F5A0B0' },
  info: { base: '#6BA0F7', soft: blue[900], onSoft: '#9CC0FA' },

  scrim: 'rgba(0, 0, 0, 0.6)',
  skeleton: neutral[850],
};

/** Resolves a category/entity tint for the active scheme. */
export function resolveTint(name: TintName, isDark: boolean): { base: string; soft: string } {
  const entry = tint[name];
  return {
    base: isDark ? entry.dark : entry.light,
    soft: isDark ? entry.softDark : entry.softLight,
  };
}

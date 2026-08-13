import { Platform, type TextStyle } from 'react-native';

/**
 * ThinkTwice uses the platform system font (SF Pro on iOS, Roboto on Android,
 * the system UI stack on web). This keeps the bundle free of font assets and
 * gives the app the native, editorial feel the design calls for.
 */
const fontFamily = Platform.select({
  ios: undefined, // System font — RN's default on iOS is SF Pro.
  android: undefined, // Roboto.
  default: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
});

export type TypographyRole =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'overline'
  | 'metric'
  | 'metricLarge'
  | 'metricSmall'
  | 'button';

type Variant = Pick<
  TextStyle,
  'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing' | 'fontFamily' | 'textTransform'
>;

const base = fontFamily ? { fontFamily } : {};

export const typography: Record<TypographyRole, Variant> = {
  /** Onboarding and empty-state headlines. */
  display: { ...base, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.6 },
  /** Screen titles and item names. */
  title: { ...base, fontSize: 21, lineHeight: 27, fontWeight: '700', letterSpacing: -0.3 },
  /** Section headers. */
  heading: { ...base, fontSize: 16, lineHeight: 21, fontWeight: '600', letterSpacing: -0.1 },
  subheading: { ...base, fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.1 },

  body: { ...base, fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { ...base, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  label: { ...base, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { ...base, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  /** Small all-caps eyebrow above a value. Use sparingly. */
  overline: {
    ...base,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  /** The number the user came to read. */
  metricLarge: { ...base, fontSize: 36, lineHeight: 42, fontWeight: '700', letterSpacing: -1 },
  metric: { ...base, fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.5 },
  metricSmall: { ...base, fontSize: 18, lineHeight: 23, fontWeight: '700', letterSpacing: -0.3 },

  button: { ...base, fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.1 },
};

/**
 * Upper bound for OS font scaling. Financial figures must stay readable, but an
 * unbounded scale breaks side-by-side metric rows on small screens.
 */
export const maxFontSizeMultiplier: Record<TypographyRole, number> = {
  display: 1.4,
  title: 1.5,
  heading: 1.6,
  subheading: 1.6,
  body: 1.8,
  bodyStrong: 1.8,
  label: 1.8,
  caption: 1.8,
  overline: 1.6,
  metricLarge: 1.3,
  metric: 1.4,
  metricSmall: 1.5,
  button: 1.4,
};

export type Typography = typeof typography;

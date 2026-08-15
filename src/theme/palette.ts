/**
 * Raw colour ramps.
 *
 * Nothing outside `theme/colors.ts` should import from here: screens and
 * components consume *semantic* colours (`colors.text.primary`) so that light
 * and dark mode stay in lockstep and a value can be retuned in one place.
 */

export const purple = {
  50: '#F3EEFE',
  100: '#E7DCFD',
  200: '#CFBAFB',
  300: '#B294F8',
  400: '#8F68F6',
  500: '#6D3FF3', // ThinkTwice accent (light mode)
  600: '#5B2FD6',
  700: '#4A25AE',
  800: '#361B7D',
  900: '#241250',
  950: '#181033',
} as const;

export const neutral = {
  0: '#FFFFFF',
  25: '#FBFBFC',
  50: '#F6F6F8',
  100: '#EFEFF3',
  150: '#E6E6EC',
  200: '#DCDCE4',
  300: '#C2C2CE',
  // Steps 350–650 exist so secondary and tertiary text can clear WCAG AA (4.5:1)
  // against every surface they appear on while still reading as a hierarchy.
  // `theme/contrast.test.ts` enforces this.
  350: '#A8A8B8',
  400: '#9A9AAA',
  450: '#8A8A9C',
  500: '#7C7C8C',
  550: '#6B6B78',
  600: '#61616F',
  650: '#5A5A67',
  700: '#494955',
  750: '#3A3A45',
  800: '#2A2A36',
  850: '#22222C',
  900: '#1A1A22',
  950: '#12121A',
  1000: '#0E0E13',
} as const;

// The `500` step of each status ramp is used as body text on light surfaces and
// the `600` step as text on the matching `100` tint, so both are dark enough to
// clear WCAG AA rather than being the most vivid version of the hue.
export const green = {
  100: '#DCF5E8',
  300: '#7FDCB0',
  400: '#0E8149',
  500: '#0A7040',
  600: '#09693C',
  700: '#0A5F36',
  900: '#0C2D1E',
} as const;

export const amber = {
  100: '#FDF0D8',
  300: '#F7CE7C',
  400: '#B36F00',
  500: '#96590A',
  600: '#8A5600',
  700: '#7E4E00',
  900: '#33240A',
} as const;

export const red = {
  100: '#FCE4E7',
  300: '#F3A2AE',
  500: '#C42B45',
  600: '#B92C45',
  700: '#8E2034',
  900: '#33141B',
} as const;

export const blue = {
  100: '#DEEAFD',
  300: '#8FB8F7',
  500: '#2563EB',
  600: '#1D4FC0',
  700: '#173C90',
  900: '#111F3D',
} as const;

/**
 * Category tints. Kept as a fixed, small set so the app never drifts into
 * "dozens of colours" — categories borrow from these, they do not define new hues.
 */
// `light`/`dark` are icon colours drawn on the matching `softLight`/`softDark`
// tile, so each pair clears the 3:1 threshold for non-text content.
export const tint = {
  // The violet tint is the brand accent itself, so it points at the ramp instead
  // of repeating the hex — the two can never drift apart.
  violet: { light: purple[500], dark: '#9B7BF8', softLight: '#F0EAFE', softDark: '#2A2148' },
  blue: { light: '#2563EB', dark: '#7BA6F5', softLight: '#E5EEFD', softDark: '#152442' },
  teal: { light: '#0D9488', dark: '#5EC9BE', softLight: '#DCF3F1', softDark: '#0F2E2C' },
  green: { light: '#0E8149', dark: '#5FD69B', softLight: '#DEF4E9', softDark: '#0F2C1F' },
  amber: { light: '#B36F00', dark: '#EEB44C', softLight: '#FBEFD9', softDark: '#33260F' },
  orange: { light: '#C24C0C', dark: '#F59260', softLight: '#FCE9DE', softDark: '#33200F' },
  red: { light: '#C42B45', dark: '#F08196', softLight: '#FBE3E7', softDark: '#331419' },
  pink: { light: '#C13A8E', dark: '#EE8FC6', softLight: '#FAE3F1', softDark: '#301226' },
  slate: { light: '#5A6072', dark: '#A3AAB9', softLight: '#EAECF1', softDark: '#242833' },
} as const;

export type TintName = keyof typeof tint;

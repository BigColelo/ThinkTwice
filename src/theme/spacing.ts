/** The only spacing values allowed in the app. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export type Spacing = typeof spacing;
export type SpacingKey = keyof Spacing;

/** Horizontal gutter used by every screen so content lines up across the app. */
export const screenPadding = spacing.lg;

/** The only spacing values allowed in the app. */
export const spacing = {
  /**
   * The gap between a line and the caption directly under it, inside a card or
   * a row. Smaller than anything that separates two blocks — it exists so the
   * two lines read as one thing — and it is a token rather than a literal `2`
   * because the app keeps every pixel in the theme.
   */
  xxxs: 2,
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

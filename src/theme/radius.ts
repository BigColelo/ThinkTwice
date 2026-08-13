export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  /** Large enough to render as a pill/circle for any control in this app. */
  full: 999,
} as const;

export type Radius = typeof radius;
export type RadiusKey = keyof Radius;

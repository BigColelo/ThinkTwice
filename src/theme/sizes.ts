/** Control and icon sizing. Keeps touch targets consistent and accessible. */
export const sizes = {
  /** iOS HIG / Material minimum tappable area. */
  minTouchTarget: 44,

  /**
   * Widest a centred paragraph is allowed to get — empty states, error copy, the
   * onboarding blurbs. A measure, not a layout: past this the eye loses the start
   * of the next line.
   */
  readableTextWidth: 320,

  control: {
    sm: 36,
    md: 44,
    lg: 52,
  },

  icon: {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
  },

  /** Square tile behind a list-row icon (commitments, categories). */
  iconTile: {
    sm: 32,
    md: 38,
    lg: 44,
  },

  /** Product thumbnails. */
  thumbnail: {
    sm: 40,
    md: 52,
    lg: 64,
  },

  tabBar: {
    height: 56,
    fabSize: 46,
  },

  /** Stroke width shared by every icon so the app reads as one set. */
  iconStrokeWidth: 2,

  hairline: 1,
} as const;

export type Sizes = typeof sizes;

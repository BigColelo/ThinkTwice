/**
 * Expected-ownership presets, in months.
 *
 * Offered as a short list rather than a free number field: the figure is an
 * estimate feeding another estimate, and asking for "about how long" is both
 * quicker and more honest than asking for a precise duration.
 */

/**
 * Only the figure. Each preset is a whole number of months or years, so its
 * label is exactly what `formatMonthsAsDuration` already produces — spelling
 * "6 months" out a second time here would be a second place to translate it,
 * and one that could disagree with the duration shown everywhere else.
 */
export const OWNERSHIP_PRESETS: readonly number[] = [6, 12, 24, 36, 60, 120];

export const DEFAULT_OWNERSHIP_MONTHS = 36;

export const MIN_OWNERSHIP_MONTHS = 1;
export const MAX_OWNERSHIP_MONTHS = 600;

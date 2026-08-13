/**
 * Expected-ownership presets, in months.
 *
 * Offered as a short list rather than a free number field: the figure is an
 * estimate feeding another estimate, and asking for "about how long" is both
 * quicker and more honest than asking for a precise duration.
 */

export type OwnershipPreset = {
  months: number;
  label: string;
};

export const OWNERSHIP_PRESETS: readonly OwnershipPreset[] = [
  { months: 6, label: '6 months' },
  { months: 12, label: '1 year' },
  { months: 24, label: '2 years' },
  { months: 36, label: '3 years' },
  { months: 60, label: '5 years' },
  { months: 120, label: '10 years' },
];

export const DEFAULT_OWNERSHIP_MONTHS = 36;

export const MIN_OWNERSHIP_MONTHS = 1;
export const MAX_OWNERSHIP_MONTHS = 600;

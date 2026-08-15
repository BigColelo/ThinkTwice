import type { TFunction } from 'i18next';

/**
 * Durations rendered as text.
 *
 * These used to live in `src/utils/dates.ts` as `pluralize`, `formatDuration`
 * and `formatMonthsAsDuration`, which appended an `s` unless the count was one.
 * That is an English rule: Italian, French and Spanish resolve three plural
 * categories, Arabic six, and the noun itself has to come from a catalogue. So
 * the arithmetic stays in `utils/dates` and the wording moved here.
 *
 * `t` is a parameter rather than a module import so a caller has to hold the
 * translation function it got from `useT()` — which is also what subscribes the
 * component to a language change.
 */

/** `8 months`, `2 years 3 months`, `12 days`, `today`. */
export function formatDuration(t: TFunction, totalMonths: number, totalDays: number): string {
  if (!Number.isFinite(totalDays) || totalDays < 0) return t('common.noValue');

  if (totalMonths < 1) {
    if (totalDays < 1) return t('duration.today');
    if (totalDays < 14) return t('units.day', { count: totalDays });
    return t('units.week', { count: Math.floor(totalDays / 7) });
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0) return t('units.month', { count: months });
  if (months === 0) return t('units.year', { count: years });
  return t('duration.yearsAndMonths', {
    years: t('units.year', { count: years }),
    months: t('units.month', { count: months }),
  });
}

/** `5 years` / `18 months` — for an expected-ownership figure entered in months. */
export function formatMonthsAsDuration(t: TFunction, totalMonths: number): string {
  if (!Number.isFinite(totalMonths) || totalMonths <= 0) return t('common.noValue');
  if (totalMonths % 12 === 0) return t('units.year', { count: totalMonths / 12 });
  if (totalMonths < 24) return t('units.month', { count: totalMonths });

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return t('duration.yearsAndMonths', {
    years: t('units.year', { count: years }),
    months: t('units.month', { count: months }),
  });
}

import {
  addDays as addDaysFn,
  addMonths as addMonthsFn,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  isValid,
  parseISO,
} from 'date-fns';

import type { IsoDate, IsoTimestamp } from '@/types/domain';

import { formatNumber, getLocale } from './currency';

/**
 * All date arithmetic and formatting for ThinkTwice.
 *
 * Storage is always an ISO-8601 UTC timestamp (or a `YYYY-MM-DD` calendar date
 * where a time would be meaningless). Nothing preformatted is ever persisted:
 * a value stored today must still format correctly if the user changes their
 * device locale tomorrow.
 *
 * `date-fns` handles calendar arithmetic (month lengths, DST); `Intl` handles
 * presentation.
 */

export function nowIso(): IsoTimestamp {
  return new Date().toISOString();
}

export function toIso(date: Date): IsoTimestamp {
  return date.toISOString();
}

/** Parses a stored timestamp. Returns `null` for anything unusable. */
export function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/** Today as `YYYY-MM-DD` in the device's local calendar. */
export function todayIsoDate(): IsoDate {
  return toIsoDate(new Date());
}

/** Formats a `Date` as `YYYY-MM-DD` using local calendar fields, not UTC. */
export function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a `YYYY-MM-DD` calendar date into local midnight. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return parseIso(value);
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return isValid(date) ? date : null;
}

export function addDays(from: Date, days: number): Date {
  return addDaysFn(from, days);
}

export function addMonths(from: Date, months: number): Date {
  return addMonthsFn(from, months);
}

/**
 * Whole calendar days from `from` to `to`. Calendar-based (not 24h-based) so a
 * cooldown that ends "tomorrow" reads as 1 day regardless of the time of day.
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from);
}

export function calendarMonthsBetween(from: Date, to: Date): number {
  return differenceInCalendarMonths(to, from);
}

// -- Presentation ------------------------------------------------------------

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${getLocale()}|${JSON.stringify(options)}`;
  const cached = dateFormatterCache.get(key);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(getLocale(), options);
  dateFormatterCache.set(key, formatter);
  return formatter;
}

/** `13 Aug 2026` — the app's default date presentation. */
export function formatDate(value: string | Date | null | undefined): string {
  const date =
    value instanceof Date ? value : (parseIsoDate(value ?? null) ?? parseIso(value ?? null));
  if (!date) return '—';
  try {
    return getDateFormatter({ day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  } catch {
    return toIsoDate(date);
  }
}

/** `13 Aug 2026, 09:12` — used where the exact moment matters. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseIso(value ?? null);
  if (!date) return '—';
  try {
    return getDateFormatter({
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * A duration in whole months, rendered the way people say it:
 * `3 days`, `2 weeks`, `8 months`, `1 year`, `2 years 3 months`.
 */
export function formatDuration(totalMonths: number, totalDays: number): string {
  if (!Number.isFinite(totalDays) || totalDays < 0) return '—';

  if (totalMonths < 1) {
    if (totalDays < 1) return 'today';
    if (totalDays < 14) return pluralize(totalDays, 'day');
    return pluralize(Math.floor(totalDays / 7), 'week');
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0) return pluralize(months, 'month');
  if (months === 0) return pluralize(years, 'year');
  return `${pluralize(years, 'year')} ${pluralize(months, 'month')}`;
}

/** `5 years` / `18 months` — for an expected-ownership figure entered in months. */
export function formatMonthsAsDuration(totalMonths: number): string {
  if (!Number.isFinite(totalMonths) || totalMonths <= 0) return '—';
  if (totalMonths % 12 === 0) return pluralize(totalMonths / 12, 'year');
  if (totalMonths < 24) return pluralize(totalMonths, 'month');
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return `${pluralize(years, 'year')} ${pluralize(months, 'month')}`;
}

export function pluralize(count: number, noun: string): string {
  const rounded = Math.round(count);
  // Through `formatNumber` so a count is grouped like every other number in the
  // app — an item used daily for five years reads "1,820 uses", not "1820 uses" —
  // and so a non-finite count renders as a dash instead of `NaN`.
  return `${formatNumber(rounded)} ${noun}${rounded === 1 ? '' : 's'}`;
}

import type { Cents, CurrencyCode } from '@/types/domain';

/**
 * The single place where money becomes text, and where text becomes money.
 *
 * Rules:
 * - Storage and arithmetic use integer cents. Nothing in the app holds a
 *   floating-point euro amount.
 * - Presentation uses `Intl.NumberFormat` so grouping, decimal separators and
 *   symbol placement follow the device locale.
 */

const MINOR_UNITS_PER_MAJOR = 100;

/**
 * The currencies the user can actually choose between.
 *
 * V1 offers EUR only, and deliberately: amounts are stored as minor units and
 * are **never converted**, so a second currency would silently re-label every
 * figure the user has already entered rather than translate it. Offering one
 * means first deciding what happens to that existing money.
 *
 * Everything else in the app already carries a currency code, so widening this
 * list is most of the work — but a currency whose minor unit is not 1/100 (the
 * yen) would additionally require `MINOR_UNITS_PER_MAJOR` to stop being a
 * constant.
 */
export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = ['EUR'];

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  EUR: 'Euro (€)',
  USD: 'US dollar ($)',
  GBP: 'British pound (£)',
  CHF: 'Swiss franc (CHF)',
};

/**
 * Resolved once. `Intl` is available on Hermes and on web; the fallback keeps
 * the app usable on any runtime where locale resolution fails.
 */
let cachedLocale: string | null = null;

export function getLocale(): string {
  if (cachedLocale) return cachedLocale;
  try {
    cachedLocale = new Intl.NumberFormat().resolvedOptions().locale || 'en-GB';
  } catch {
    cachedLocale = 'en-GB';
  }
  return cachedLocale;
}

/** Test seam — lets unit tests pin a locale instead of depending on the runner's. */
export function setLocaleForTesting(locale: string | null): void {
  cachedLocale = locale;
  formatterCache.clear();
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: CurrencyCode, minimumFractionDigits: number): Intl.NumberFormat {
  const key = `${getLocale()}|${currency}|${minimumFractionDigits}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });
  formatterCache.set(key, formatter);
  return formatter;
}

export type MoneyDecimals =
  /** Hide `,00` on round amounts (the app default — matches the design). */
  | 'auto'
  /** Always show two decimals, e.g. in a cost-per-use figure. */
  | 'always'
  /** Never show decimals, e.g. in a compact chart label. */
  | 'never';

export type FormatMoneyOptions = {
  currency?: CurrencyCode;
  decimals?: MoneyDecimals;
  /** Prefixes `+` for positive values. Negative values always keep their sign. */
  signDisplay?: boolean;
};

/**
 * Formats integer cents for display.
 *
 * `formatMoney(178900)` → `€1,789` and `formatMoney(1799)` → `€17.99` under
 * `en-GB`; the same values render as `1.789 €` / `17,99 €` under `de-DE`.
 */
export function formatMoney(cents: Cents, options: FormatMoneyOptions = {}): string {
  const { currency = 'EUR', decimals = 'auto', signDisplay = false } = options;

  if (!Number.isFinite(cents)) return '—';

  // `|| 0` collapses -0 to 0. A tiny negative rate (or a resale value a cent
  // above the amount spent) would otherwise render as "-€0".
  const rounded = Math.round(cents) || 0;
  const isWhole = rounded % MINOR_UNITS_PER_MAJOR === 0;
  const minimumFractionDigits =
    decimals === 'always' ? 2 : decimals === 'never' ? 0 : isWhole ? 0 : 2;

  const value =
    decimals === 'never'
      ? Math.round(rounded / MINOR_UNITS_PER_MAJOR)
      : rounded / MINOR_UNITS_PER_MAJOR;

  let text: string;
  try {
    text = getFormatter(currency, minimumFractionDigits).format(value);
  } catch {
    // Extremely defensive: a runtime without full ICU still shows a usable figure.
    text = `${value.toFixed(minimumFractionDigits)} ${currency}`;
  }

  return signDisplay && rounded > 0 ? `+${text}` : text;
}

/**
 * Compact form for dense chart labels: `€4.8k`, `€1.2M`.
 * Falls back to the standard format below 10 000 minor units of the major unit.
 */
export function formatMoneyCompact(cents: Cents, options: FormatMoneyOptions = {}): string {
  const { currency = 'EUR' } = options;
  const major = Math.round(cents) / MINOR_UNITS_PER_MAJOR;

  if (!Number.isFinite(major)) return '—';
  if (Math.abs(major) < 10_000) return formatMoney(cents, options);

  try {
    return new Intl.NumberFormat(getLocale(), {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(major);
  } catch {
    return formatMoney(cents, options);
  }
}

/** Returns just the currency symbol, for input adornments. */
export function currencySymbol(currency: CurrencyCode = 'EUR'): string {
  try {
    const parts = new Intl.NumberFormat(getLocale(), { style: 'currency', currency }).formatToParts(
      0,
    );
    return parts.find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/**
 * Parses a user-typed amount into integer cents. Returns `null` when the text
 * is not a usable amount, so callers surface a validation message instead of
 * silently storing `NaN`.
 *
 * Separator handling: the last `.` or `,` followed by exactly one or two digits
 * is treated as the decimal separator; every other separator is grouping. This
 * reads `17,99`, `17.99`, `1.234,56`, `1,234.56` and `1,500` the way a user in
 * any of ThinkTwice's target locales means them.
 */
export function parseMoneyInput(input: string): Cents | null {
  if (typeof input !== 'string') return null;

  const cleaned = input.replace(/[^\d.,-]/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;

  const negative = cleaned.startsWith('-');
  const digitsAndSeparators = cleaned.replace(/-/g, '');

  const decimalMatch = /[.,](\d{1,2})$/.exec(digitsAndSeparators);
  let whole: string;
  let fraction: string;

  if (decimalMatch) {
    const separatorIndex = digitsAndSeparators.length - decimalMatch[0].length;
    whole = digitsAndSeparators.slice(0, separatorIndex).replace(/[.,]/g, '');
    fraction = decimalMatch[1] ?? '';
  } else {
    whole = digitsAndSeparators.replace(/[.,]/g, '');
    fraction = '';
  }

  if (whole === '' && fraction === '') return null;
  if (!/^\d*$/.test(whole)) return null;

  const wholeValue = whole === '' ? 0 : Number.parseInt(whole, 10);
  const fractionValue = Number.parseInt(fraction.padEnd(2, '0') || '0', 10);

  if (!Number.isFinite(wholeValue) || !Number.isFinite(fractionValue)) return null;

  const total = wholeValue * MINOR_UNITS_PER_MAJOR + fractionValue;
  if (!Number.isSafeInteger(total)) return null;

  return negative ? -total : total;
}

/**
 * Renders cents as a plain editable string (no symbol, locale decimal
 * separator) for prefilling a form field.
 */
export function centsToInputString(cents: Cents | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return '';
  const rounded = Math.round(cents);
  if (rounded % MINOR_UNITS_PER_MAJOR === 0) return String(rounded / MINOR_UNITS_PER_MAJOR);
  try {
    return new Intl.NumberFormat(getLocale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false,
    }).format(rounded / MINOR_UNITS_PER_MAJOR);
  } catch {
    return (rounded / MINOR_UNITS_PER_MAJOR).toFixed(2);
  }
}

/** Formats a ratio (`1.09`) as a percentage string (`109%`). */
export function formatPercent(ratio: number | null, fractionDigits = 0): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  // `|| 0` collapses -0, which would otherwise render as "-0%".
  const safeRatio = ratio || 0;
  try {
    return new Intl.NumberFormat(getLocale(), {
      style: 'percent',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(safeRatio);
  } catch {
    return `${(safeRatio * 100).toFixed(fractionDigits)}%`;
  }
}

/** Formats a plain number (`2.1`, `650`) with locale grouping. */
export function formatNumber(value: number | null, fractionDigits = 0): string {
  if (value == null || !Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(getLocale(), {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    return value.toFixed(fractionDigits);
  }
}

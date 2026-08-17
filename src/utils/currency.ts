import type { Cents, CurrencyCode } from '@/types/domain';

import { getLocale } from './locale';

/**
 * The single place where money becomes text, and where text becomes money.
 *
 * Rules:
 * - Storage and arithmetic use integer cents. Nothing in the app holds a
 *   floating-point amount.
 * - Presentation uses `Intl.NumberFormat` so grouping, decimal separators and
 *   the side the currency sits on follow the locale of the chosen language
 *   (`src/utils/locale`).
 * - The currency is always its ISO code, never a symbol. There is no complete
 *   symbol set to render: ICU writes CHF as `CHF`, USD as `US$` outside
 *   `en-US`, and most Arab-state currencies as their code in every locale but
 *   `ar`. Half a list in symbols and half in codes reads as a bug, so it is
 *   codes for all of them — and a code is also the one label that is never
 *   ambiguous between two dollars or three pounds.
 *
 * One thing to know before asserting on this output: ICU separates the code
 * from the amount with a **non-breaking** space (U+00A0), not a plain one.
 */

/**
 * Every currency the app offers is one hundredth of its major unit.
 *
 * That is the app's convention rather than the ISO exponent, and the difference
 * is deliberate. KWD, BHD, OMR, JOD, LYD and TND are defined with three
 * decimals; DJF, KMF, IQD, SOS, SYP and LBP with none. All twelve are shown
 * here with two, because amounts are stored as minor units and are **never
 * converted**: switching currency has to relabel a figure and must never change
 * it. 165000 minor units reads `EUR 1,650` and, after a switch, `KWD 1,650` —
 * the same amount under a different name.
 *
 * Honouring each ISO exponent instead would move the decimal point on money the
 * user has already entered, which is a silent edit to their own records.
 */
const MINOR_UNITS_PER_MAJOR = 100;

/**
 * The currency is rendered as its ISO 4217 code everywhere, for the reason at
 * the top of this file. Kept as a module constant rather than an option so no
 * caller can render half the app in symbols.
 */
const CURRENCY_DISPLAY = 'code' as const;

// `Intl` is available on Hermes and on web; every call below still falls back
// to a hand-formatted figure so a runtime without full ICU stays usable.
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: CurrencyCode, minimumFractionDigits: number): Intl.NumberFormat {
  const key = `${getLocale()}|${currency}|${minimumFractionDigits}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    currencyDisplay: CURRENCY_DISPLAY,
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
 * `formatMoney(178900)` → `EUR 1,789` and `formatMoney(1799)` → `EUR 17.99`
 * under `en-GB`; the same values render as `1.789 EUR` / `17,99 EUR` under
 * `de-DE`. The space is the non-breaking one ICU emits, not a plain space.
 */
export function formatMoney(cents: Cents, options: FormatMoneyOptions = {}): string {
  const { currency = 'EUR', decimals = 'auto', signDisplay = false } = options;

  if (!Number.isFinite(cents)) return '—';

  // `|| 0` collapses -0 to 0. A tiny negative rate (or a resale value a cent
  // above the amount spent) would otherwise render as "-EUR 0".
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
    // Extremely defensive: a runtime without full ICU still shows a usable
    // figure — and one that reads the same way, since the code is the label
    // either way. Only the side it sits on can differ.
    text = `${value.toFixed(minimumFractionDigits)} ${currency}`;
  }

  return signDisplay && rounded > 0 ? `+${text}` : text;
}

/**
 * Compact form for dense chart labels: `EUR 4.8K`, `EUR 1.2M`.
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
      currencyDisplay: CURRENCY_DISPLAY,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(major);
  } catch {
    return formatMoney(cents, options);
  }
}

/** Where the currency code sits relative to the amount in the active locale. */
export type CurrencyAdornment = {
  /** The ISO code, e.g. `EUR`. Never a symbol — see the note at the top. */
  code: string;
  /** `en-GB` writes `EUR 17.99`, `it-IT` writes `17,99 EUR`. */
  position: 'prefix' | 'suffix';
};

/**
 * The currency code and the side it belongs on, for input adornments.
 *
 * The position is read from the locale rather than assumed: putting the code in
 * front of the amount is right in English and wrong in Italian, German, French,
 * Spanish and Arabic, where it follows the figure. That is a property of the
 * locale and not of the currency — every code the app offers sits on the same
 * side within one language, which `currency.test.ts` asserts.
 */
export function currencyAdornment(currency: CurrencyCode = 'EUR'): CurrencyAdornment {
  try {
    const parts = new Intl.NumberFormat(getLocale(), {
      style: 'currency',
      currency,
      currencyDisplay: CURRENCY_DISPLAY,
    }).formatToParts(0);
    const codeIndex = parts.findIndex((part) => part.type === 'currency');
    const numberIndex = parts.findIndex((part) => part.type === 'integer');

    return {
      code: parts[codeIndex]?.value ?? currency,
      position: codeIndex >= 0 && numberIndex >= 0 && codeIndex > numberIndex ? 'suffix' : 'prefix',
    };
  } catch {
    return { code: currency, position: 'prefix' };
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
 * any of ThinkTwice's target locales means them. A third decimal is therefore
 * read as grouping — `1,234.567` is 123456700, not 123457. That follows from
 * every currency being one hundredth of its major unit here, so nothing in the
 * app ever shows a third decimal to prompt one.
 *
 * Everything that is not a digit or a separator is stripped first, which is
 * what makes a pasted `EUR 1,650` — non-breaking space and all — readable.
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

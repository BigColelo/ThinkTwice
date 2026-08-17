import type { TranslationKey } from '@/i18n';
import type { CurrencyCode, LanguageCode } from '@/types/domain';

/**
 * The currencies the app offers, and how the picker groups them.
 *
 * The code is what gets persisted, so retranslating a name is safe while
 * changing a code would need a migration. The name is never stored: each
 * currency carries the key of its own name, exactly as `Category` and
 * `UsagePreset` do, so one stored row reads "Saudi riyal" or "ريال سعودي"
 * depending only on the chosen language.
 *
 * Nothing here is a symbol. `src/utils/currency` labels every amount with the
 * ISO code, for the reason documented there.
 */

/**
 * The sections of the picker.
 *
 * Geographic on purpose. A "major" or "international" group would rank one
 * currency above another, which is the kind of judgement the app declines to
 * make everywhere else; the suggested group above these already puts the ones a
 * given reader is likely to want within reach.
 */
export type CurrencyRegionId = 'europe' | 'americas' | 'middle_east_africa' | 'oceania';

export type Currency = {
  code: CurrencyCode;
  nameKey: TranslationKey;
  region: CurrencyRegionId;
};

/** Section order in the picker; each carries the key of its own heading. */
export const CURRENCY_REGIONS: readonly { id: CurrencyRegionId; labelKey: TranslationKey }[] = [
  { id: 'europe', labelKey: 'settings.currency.regions.europe' },
  { id: 'americas', labelKey: 'settings.currency.regions.americas' },
  { id: 'middle_east_africa', labelKey: 'settings.currency.regions.middle_east_africa' },
  { id: 'oceania', labelKey: 'settings.currency.regions.oceania' },
];

/** Declared once: it is both a row in the table below and the fallback under it. */
const EURO: Currency = { code: 'EUR', nameKey: 'currencies.EUR', region: 'europe' };

/** The table, in the order the picker lists each section. */
export const CURRENCIES: readonly Currency[] = [
  EURO,
  { code: 'GBP', nameKey: 'currencies.GBP', region: 'europe' },
  { code: 'CHF', nameKey: 'currencies.CHF', region: 'europe' },

  { code: 'USD', nameKey: 'currencies.USD', region: 'americas' },
  { code: 'CAD', nameKey: 'currencies.CAD', region: 'americas' },
  { code: 'MXN', nameKey: 'currencies.MXN', region: 'americas' },
  { code: 'ARS', nameKey: 'currencies.ARS', region: 'americas' },
  { code: 'COP', nameKey: 'currencies.COP', region: 'americas' },
  { code: 'CLP', nameKey: 'currencies.CLP', region: 'americas' },
  { code: 'PEN', nameKey: 'currencies.PEN', region: 'americas' },
  { code: 'UYU', nameKey: 'currencies.UYU', region: 'americas' },
  { code: 'BOB', nameKey: 'currencies.BOB', region: 'americas' },
  { code: 'PYG', nameKey: 'currencies.PYG', region: 'americas' },
  { code: 'DOP', nameKey: 'currencies.DOP', region: 'americas' },
  { code: 'GTQ', nameKey: 'currencies.GTQ', region: 'americas' },
  { code: 'CRC', nameKey: 'currencies.CRC', region: 'americas' },
  { code: 'HNL', nameKey: 'currencies.HNL', region: 'americas' },
  { code: 'NIO', nameKey: 'currencies.NIO', region: 'americas' },
  { code: 'CUP', nameKey: 'currencies.CUP', region: 'americas' },
  { code: 'VES', nameKey: 'currencies.VES', region: 'americas' },

  // The Gulf, then the Levant, then North Africa, the Horn and the two CFA
  // francs. ILS is here because it is a currency in circulation in Palestine.
  { code: 'AED', nameKey: 'currencies.AED', region: 'middle_east_africa' },
  { code: 'SAR', nameKey: 'currencies.SAR', region: 'middle_east_africa' },
  { code: 'QAR', nameKey: 'currencies.QAR', region: 'middle_east_africa' },
  { code: 'BHD', nameKey: 'currencies.BHD', region: 'middle_east_africa' },
  { code: 'KWD', nameKey: 'currencies.KWD', region: 'middle_east_africa' },
  { code: 'OMR', nameKey: 'currencies.OMR', region: 'middle_east_africa' },
  { code: 'JOD', nameKey: 'currencies.JOD', region: 'middle_east_africa' },
  { code: 'LBP', nameKey: 'currencies.LBP', region: 'middle_east_africa' },
  { code: 'SYP', nameKey: 'currencies.SYP', region: 'middle_east_africa' },
  { code: 'IQD', nameKey: 'currencies.IQD', region: 'middle_east_africa' },
  { code: 'YER', nameKey: 'currencies.YER', region: 'middle_east_africa' },
  { code: 'ILS', nameKey: 'currencies.ILS', region: 'middle_east_africa' },
  { code: 'EGP', nameKey: 'currencies.EGP', region: 'middle_east_africa' },
  { code: 'LYD', nameKey: 'currencies.LYD', region: 'middle_east_africa' },
  { code: 'TND', nameKey: 'currencies.TND', region: 'middle_east_africa' },
  { code: 'DZD', nameKey: 'currencies.DZD', region: 'middle_east_africa' },
  { code: 'MAD', nameKey: 'currencies.MAD', region: 'middle_east_africa' },
  { code: 'MRU', nameKey: 'currencies.MRU', region: 'middle_east_africa' },
  { code: 'SDG', nameKey: 'currencies.SDG', region: 'middle_east_africa' },
  { code: 'SOS', nameKey: 'currencies.SOS', region: 'middle_east_africa' },
  { code: 'KMF', nameKey: 'currencies.KMF', region: 'middle_east_africa' },
  { code: 'DJF', nameKey: 'currencies.DJF', region: 'middle_east_africa' },
  { code: 'XOF', nameKey: 'currencies.XOF', region: 'middle_east_africa' },
  { code: 'XAF', nameKey: 'currencies.XAF', region: 'middle_east_africa' },

  { code: 'AUD', nameKey: 'currencies.AUD', region: 'oceania' },
  { code: 'NZD', nameKey: 'currencies.NZD', region: 'oceania' },
];

/**
 * The currencies the user can actually choose between — read off the table, so
 * the two cannot drift apart.
 *
 * `src/db/mappers` validates a stored code against this rather than against the
 * `CurrencyCode` type: a code written by a build that offered more would
 * otherwise leave the user reading amounts labelled with something no control
 * in the app can change back.
 */
export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = CURRENCIES.map(
  (currency) => currency.code,
);

/**
 * What the picker offers first, per language.
 *
 * Keyed by language rather than carried as a field on each currency, for three
 * reasons. The list is ordered, and an order cannot be expressed by membership
 * scattered across forty-six rows. "What should someone reading Arabic see
 * first" is one editorial judgement, and it is only reviewable if it is written
 * in one place. And a `Record` over `LanguageCode` is exhaustive by type: a
 * seventh language will not compile until it has a list, where a per-row field
 * would quietly give it none.
 *
 * Language and not region, because the app has no region setting — it
 * deliberately offers one German rather than a regional choice it could not
 * honour anyway.
 *
 * Kept short. Every currency appears in exactly one section of the picker, so
 * each suggestion is one taken out of its own region below.
 */
export const SUGGESTED_CURRENCIES: Record<LanguageCode, readonly CurrencyCode[]> = {
  en: ['EUR', 'GBP', 'USD', 'CHF'],
  it: ['EUR', 'CHF', 'USD', 'GBP'],
  de: ['EUR', 'CHF', 'USD', 'GBP'],
  fr: ['EUR', 'CHF', 'USD', 'CAD', 'XOF', 'XAF'],
  es: ['EUR', 'USD', 'MXN', 'ARS', 'COP', 'CLP'],
  ar: ['AED', 'SAR', 'EGP', 'MAD', 'QAR', 'KWD'],
};

const BY_CODE = new Map<CurrencyCode, Currency>(
  CURRENCIES.map((currency) => [currency.code, currency]),
);

export function getCurrency(code: CurrencyCode): Currency {
  // Unreachable for valid data; keeping a total function avoids `undefined`
  // reaching a `t()` call, which would print a raw key at the user.
  return BY_CODE.get(code) ?? EURO;
}

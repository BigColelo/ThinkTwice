import type { LanguageCode, LanguagePreference } from '@/types/domain';

/**
 * The languages the app ships, and the `Intl` locale each one formats with.
 *
 * Separate from `./languages` because this file imports nothing but types,
 * while reading the *device's* language needs `expo-localization`. `src/db`
 * validates a stored preference against `LANGUAGE_PREFERENCES`, and the data
 * layer has no business pulling a native module in to do it — which is also
 * what would have made a repository unusable in a plain Node test.
 *
 * Language and locale are deliberately separate values. i18next resolves plural
 * categories from the short code (`ar` → six categories, `de` → two), while
 * every number, amount and date is formatted with the full tag below.
 */

export const SUPPORTED_LANGUAGES: readonly LanguageCode[] = ['en', 'it', 'de', 'fr', 'es', 'ar'];

export const LANGUAGE_PREFERENCES: readonly LanguagePreference[] = [
  'system',
  ...SUPPORTED_LANGUAGES,
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/**
 * Every language is pinned to one region so a figure never changes shape
 * because the device happens to be set to another one.
 *
 * `en` maps to `en-GB` rather than `en-US`: the app is euro-first, and it is the
 * form every worked example in the tests was written against.
 *
 * Arabic carries two Unicode extensions on purpose. `nu-latn` keeps digits
 * Latin — Arabic-Indic digits would come back out of `centsToInputString` into a
 * money field whose parser only reads `0-9`, and the amount would clear itself
 * on blur. `ca-gregory` pins the calendar, because ICU resolves `ar` in some
 * regions to the Umm al-Qura calendar, which would print a date the stored
 * ISO value does not mean.
 */
export const LANGUAGE_LOCALES: Record<LanguageCode, string> = {
  en: 'en-GB',
  it: 'it-IT',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  ar: 'ar-u-ca-gregory-nu-latn',
};

/** Each language named in itself — never translated, that is the point of it. */
export const LANGUAGE_NATIVE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  it: 'Italiano',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  ar: 'العربية',
};

/**
 * Languages written in a script whose letters join to their neighbours.
 *
 * Text in them is never letter-spaced. Tracking pulls the joined letters of a
 * word apart, which is simply wrong typography — and on Android it also makes a
 * single-line label measure narrower than it draws, so its last letter is cut
 * off behind an ellipsis: the Settings title rendered as "الإعدادا…".
 */
const CONNECTED_SCRIPT_LANGUAGES: readonly LanguageCode[] = ['ar'];

export function writesInConnectedScript(language: LanguageCode): boolean {
  return CONNECTED_SCRIPT_LANGUAGES.includes(language);
}

export function isSupportedLanguage(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

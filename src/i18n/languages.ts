import { getLocales } from 'expo-localization';

import type { LanguageCode, LanguagePreference } from '@/types/domain';

/**
 * The `Intl` locale each language formats with, and how a preference becomes a
 * language.
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

export function isSupportedLanguage(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * The device's language, if the app has it. Only the language subtag is
 * considered: someone on `de-AT` or `de-CH` gets German, since the app offers
 * one German rather than a regional choice it could not honour anyway.
 */
export function resolveDeviceLanguage(): LanguageCode {
  try {
    for (const locale of getLocales()) {
      const code = locale.languageCode?.toLowerCase();
      if (isSupportedLanguage(code)) return code;
    }
  } catch {
    // Localization is unavailable on this runtime; the fallback is the answer.
  }
  return DEFAULT_LANGUAGE;
}

/** Turns the stored preference into the language actually in use. */
export function resolveLanguage(preference: LanguagePreference): LanguageCode {
  return preference === 'system' ? resolveDeviceLanguage() : preference;
}

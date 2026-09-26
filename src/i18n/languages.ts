import { getLocales } from 'expo-localization';

import type { LanguageCode, LanguagePreference } from '@/types/domain';

import { DEFAULT_LANGUAGE, isSupportedLanguage } from './languageCodes';

/**
 * How a preference becomes the language actually in use.
 *
 * This is the half that touches the device, through `expo-localization`. The
 * tables themselves — which languages exist, what each formats with, what each
 * is called — live in `./languageCodes`, which imports nothing, so the data
 * layer can validate a stored preference without loading a native module.
 */

export {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  LANGUAGE_LOCALES,
  LANGUAGE_NATIVE_NAMES,
  LANGUAGE_PREFERENCES,
  SUPPORTED_LANGUAGES,
  writesInConnectedScript,
} from './languageCodes';

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

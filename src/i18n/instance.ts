import { createInstance, type ParseKeys, type TFunction } from 'i18next';

import type { LanguageCode } from '@/types/domain';
import { formatNumber } from '@/utils/currency';
import { formatDate, formatDateTime } from '@/utils/dates';
import { setActiveLocale } from '@/utils/locale';

import { DEFAULT_LANGUAGE, LANGUAGE_LOCALES } from './languages';
import { ar } from './locales/ar';
import { de } from './locales/de';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { it } from './locales/it';

/**
 * The translation instance.
 *
 * All six catalogues are bundled rather than fetched: the app has no network in
 * its data path, so every language must be usable in airplane mode on first
 * launch.
 *
 * It is a module singleton because two callers need it outside React — the
 * notification adapter, which builds reminder copy from a plain async function,
 * and `I18nProvider`, which applies a language before the tree below it renders.
 * `createInstance` rather than the package default, so the app owns its own
 * configuration outright.
 *
 * No React binding is installed. `I18nProvider` hands components a `t` through
 * context, so nothing subscribes to this instance's `languageChanged` event —
 * which is what stopped a language change from calling `setState` on a component
 * that was still rendering.
 */

const resources = {
  en: { translation: en },
  it: { translation: it },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  ar: { translation: ar },
};

const i18n = createInstance();

void i18n.init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'translation',
  // Nothing is rendered as HTML, and escaping would turn a name containing an
  // apostrophe into `&#39;` inside an accessibility label.
  interpolation: { escapeValue: false },
  // Resources are already in memory, so initialisation and every language
  // change complete synchronously — which is what lets the provider apply a
  // language during render rather than in an effect.
  initAsync: false,
});

/**
 * Interpolation formatters.
 *
 * They delegate to the app's own helpers rather than calling `Intl` themselves,
 * so `src/utils/currency.ts` stays the only module that turns a number into
 * text and a translated sentence cannot drift from the figure beside it.
 */
i18n.services.formatter?.add('number', (value) =>
  typeof value === 'number' ? formatNumber(value) : String(value),
);
i18n.services.formatter?.add('decimal', (value) =>
  typeof value === 'number' ? formatNumber(value, 1) : String(value),
);
i18n.services.formatter?.add('date', (value) => formatDate(value as string | Date));
i18n.services.formatter?.add('dateTime', (value) => formatDateTime(value as string | Date));

/**
 * Switches the app's language and the locale every formatter reads.
 *
 * Both happen together on purpose: a screen showing Italian copy beside a date
 * formatted `13 Aug 2026` would read worse than either language on its own.
 */
export function applyLanguage(language: LanguageCode): void {
  setActiveLocale(LANGUAGE_LOCALES[language]);
  if (i18n.language !== language) {
    void i18n.changeLanguage(language);
  }
}

/** The current language, for the few callers that need it outside React. */
export function activeLanguage(): LanguageCode {
  return (i18n.language as LanguageCode | undefined) ?? DEFAULT_LANGUAGE;
}

/**
 * Translation outside React — the notification adapter, which has no component
 * to hang a hook on. Inside a component use `useT()` instead, so the text
 * re-renders when the language changes.
 */
export const t: TFunction = i18n.t;

/**
 * Any key the catalogue defines.
 *
 * Lets a data table carry the key of its own label — `PURCHASE_CATEGORIES`,
 * `USAGE_PRESETS` — and still have a typo rejected at compile time, instead of
 * the id-to-copy mapping being duplicated in whichever screen renders it.
 */
export type TranslationKey = ParseKeys;

export { i18n };

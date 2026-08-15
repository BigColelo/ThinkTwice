import type { EnglishCatalogue } from './locales/en';

/**
 * Types `t()` against the English catalogue.
 *
 * This is what turns a mistyped key into a compile error at the call site
 * instead of a raw `wishlist.ttile` appearing on screen. English is the shape
 * every other language is measured against; their completeness is checked by
 * `catalogues.test.ts`, which understands that Arabic needs plural forms
 * English does not have.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: EnglishCatalogue };
    returnNull: false;
  }
}

/**
 * The locale every `Intl` formatter in the app resolves against.
 *
 * It lives in its own module for two reasons. `currency.ts` and `dates.ts` both
 * need it and `dates.ts` already imports from `currency.ts`, so owning it in
 * either one would make setting it from the outside a circular import. And the
 * formatters are pure functions read during render, so the active locale has to
 * be a value they can look up rather than an argument threaded through a
 * hundred call sites.
 *
 * `src/i18n` is the only writer: the chosen language decides the locale, and it
 * is applied before the tree below it renders. Nothing else should call
 * `setActiveLocale`.
 */

/** Used until a language is applied, and whenever locale resolution fails. */
const FALLBACK_LOCALE = 'en-GB';

let activeLocale: string | null = null;

export function getLocale(): string {
  if (activeLocale) return activeLocale;
  // No language applied yet — a module imported before the first render, or a
  // unit test exercising a formatter directly. The device locale is the closest
  // useful guess.
  try {
    activeLocale = new Intl.NumberFormat().resolvedOptions().locale || FALLBACK_LOCALE;
  } catch {
    activeLocale = FALLBACK_LOCALE;
  }
  return activeLocale;
}

/**
 * Points every formatter at a new locale. Passing `null` restores the device
 * locale on the next read.
 *
 * The formatter caches in `currency.ts` and `dates.ts` key on the locale, so
 * there is nothing to invalidate here — a switch simply misses the cache once.
 */
export function setActiveLocale(locale: string | null): void {
  activeLocale = locale;
}

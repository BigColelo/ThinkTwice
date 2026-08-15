import type { TFunction } from 'i18next';
import React, { createContext, useContext, useMemo } from 'react';

import type { LanguagePreference } from '@/types/domain';

import { applyLanguage, i18n } from './instance';
import { resolveLanguage } from './languages';

/**
 * Applies a language to everything below it.
 *
 * The provider takes the preference as a prop and resolves it, exactly like
 * `ThemeProvider` takes `mode` and resolves `system` against the colour scheme.
 * It is mounted twice for the same reason the theme is: once above the database
 * gate, so "Opening your data" is already translated, and again below settings,
 * once the stored preference is known.
 *
 * **The translation function travels through context, not through i18next's own
 * event emitter.** `react-i18next` subscribes every `useTranslation()` caller to
 * a `languageChanged` event, and `changeLanguage` emits it synchronously — so
 * switching language while rendering the inner provider called `setState` on
 * `DatabaseGate`, which sits *above* it and was already committed. React refuses
 * that, correctly: a component may not update another one while rendering. A
 * context value changes for the subtree below in the same render pass instead,
 * which is the ordinary data flow and has no such hazard.
 *
 * The locale the pure formatters read is still set **during render**. Money and
 * dates are formatted by functions that look it up at call time, so doing it in
 * an effect would let the children paint one frame with the previous language's
 * separators and month names. That call writes module state and nothing else —
 * no component is notified — and it is derived only from the prop, so a repeated
 * render lands on the same value.
 */

const TranslationContext = createContext<TFunction | null>(null);

export function I18nProvider({
  language,
  children,
}: {
  language: LanguagePreference;
  children: React.ReactNode;
}): React.ReactElement {
  const resolved = resolveLanguage(language);

  applyLanguage(resolved);

  // Bound to this provider's language rather than to "whatever is current", so
  // the gate above keeps rendering in the device's language after the user
  // picks another one — which is what it was mounted to do.
  const t = useMemo(() => i18n.getFixedT(resolved), [resolved]);

  return <TranslationContext.Provider value={t}>{children}</TranslationContext.Provider>;
}

/**
 * The translation function for the nearest provider's language.
 *
 * Reading it also subscribes the component to a language change, which is what
 * re-renders a screen when the user picks another one.
 */
export function useT(): TFunction {
  const t = useContext(TranslationContext);
  if (!t) {
    throw new Error('useT must be used inside an <I18nProvider>.');
  }
  return t;
}

import { I18nManager, Platform } from 'react-native';

import type { LanguageCode } from '@/types/domain';

/**
 * Layout direction, isolated here because it is the one part of i18n that
 * cannot be applied while the app is running.
 *
 * React Native resolves `flexDirection: 'row'`, text alignment and gesture
 * direction against a flag Yoga reads when the view hierarchy is created. Native
 * platforms therefore need a restart to lay out mirrored; the web has no such
 * constraint and flips on the spot.
 */

const RTL_LANGUAGES: readonly LanguageCode[] = ['ar'];

export function isRtlLanguage(language: LanguageCode): boolean {
  return RTL_LANGUAGES.includes(language);
}

/** The direction the app is currently laid out in, whatever the language says. */
export function currentLayoutIsRtl(): boolean {
  return Platform.OS === 'web' ? readDocumentDirection() === 'rtl' : I18nManager.isRTL;
}

/**
 * Records the direction a language needs and applies it where it can.
 *
 * Returns `true` when the app is still laid out the other way round, which is
 * what the language screen turns into "close and reopen the app". Callers that
 * do not care can ignore it: the flag is stored either way, so the next launch
 * is correct even if the user never sees the message.
 */
export function applyLayoutDirection(language: LanguageCode): boolean {
  const shouldBeRtl = isRtlLanguage(language);

  if (Platform.OS === 'web') {
    writeDocumentDirection(shouldBeRtl ? 'rtl' : 'ltr');
    return false;
  }

  // Allowed unconditionally: without it `forceRTL` is ignored on builds that
  // were not started in an RTL locale, and the flag would silently never apply.
  I18nManager.allowRTL(true);
  const wasRtl = I18nManager.isRTL;
  I18nManager.forceRTL(shouldBeRtl);

  return wasRtl !== shouldBeRtl;
}

function readDocumentDirection(): string {
  if (typeof document === 'undefined') return 'ltr';
  return document.documentElement.getAttribute('dir') ?? 'ltr';
}

function writeDocumentDirection(direction: 'ltr' | 'rtl'): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('dir', direction);
}

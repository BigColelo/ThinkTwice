import { SUPPORTED_LANGUAGES } from './languages';
import { isRtlLanguage } from './rtl';

/**
 * Which languages are laid out right to left.
 *
 * The flag itself is applied by `applyLayoutDirection`, which touches
 * `I18nManager` and only takes effect after a restart on native — not something
 * a unit test can exercise. What is worth pinning is the classification: adding
 * a seventh language and forgetting it is right-to-left would ship a mirrored
 * script in a left-to-right layout, and nothing else in the app would notice.
 */

describe('isRtlLanguage', () => {
  it('is true for Arabic', () => {
    expect(isRtlLanguage('ar')).toBe(true);
  });

  it('is false for every language written left to right', () => {
    for (const language of SUPPORTED_LANGUAGES.filter((code) => code !== 'ar')) {
      expect([language, isRtlLanguage(language)]).toEqual([language, false]);
    }
  });
});

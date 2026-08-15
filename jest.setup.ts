import { applyLanguage, DEFAULT_LANGUAGE } from '@/i18n';

/**
 * Test setup.
 *
 * The language — and with it the locale every `Intl` formatter resolves against
 * — is pinned before every test, so assertions about copy, formatted money and
 * dates do not depend on the machine running the suite, and so a test that
 * deliberately switches language cannot leak into the next one even if it fails
 * before restoring it.
 */
beforeEach(() => {
  applyLanguage(DEFAULT_LANGUAGE);
});

import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/dates';

import { applyLanguage } from './instance';
import {
  LANGUAGE_LOCALES,
  LANGUAGE_NATIVE_NAMES,
  resolveDeviceLanguage,
  resolveLanguage,
  SUPPORTED_LANGUAGES,
} from './languages';

/**
 * The half of a language that is not copy.
 *
 * Choosing Italian has to change `1,650` into `1.650` and `13 Aug` into
 * `13 ago`, or the screen ends up half translated — which is the failure this
 * covers. Arabic additionally has to keep Latin digits and the Gregorian
 * calendar, both of which come from its locale tag rather than from ICU's
 * defaults.
 */

const AMOUNT = 165_000;
const DATE = '2026-08-13';

/** Locale output separates the symbol with a non-breaking space in some languages. */
const normalise = (value: string): string => value.replace(/\s/g, ' ');

afterEach(() => {
  applyLanguage('en');
});

describe('money follows the language', () => {
  it.each([
    ['en', '€1,650'],
    // Italian and Spanish only group from five digits up, so €1,650 keeps no
    // separator at all — a difference an "insert a dot every three digits" rule
    // would get wrong in both directions.
    ['it', '1650 €'],
    ['de', '1.650 €'],
    ['fr', '1 650 €'],
    ['es', '1650 €'],
    ['ar', '‏1,650 €'],
  ] as const)('%s formats an amount its own way', (language, expected) => {
    applyLanguage(language);
    expect(normalise(formatMoney(AMOUNT))).toBe(normalise(expected));
  });

  it.each([
    ['en', '€12,500'],
    ['it', '12.500 €'],
    ['de', '12.500 €'],
    ['es', '12.500 €'],
  ] as const)('%s groups a five-digit amount', (language, expected) => {
    applyLanguage(language);
    expect(normalise(formatMoney(1_250_000))).toBe(normalise(expected));
  });

  it.each([
    ['en', '€17.99'],
    ['it', '17,99 €'],
    ['de', '17,99 €'],
    ['fr', '17,99 €'],
    ['es', '17,99 €'],
  ] as const)('%s uses its own decimal separator', (language, expected) => {
    applyLanguage(language);
    expect(normalise(formatMoney(1_799))).toBe(normalise(expected));
  });
});

describe('dates follow the language', () => {
  it.each([
    ['en', '13 Aug 2026'],
    ['it', '13 ago 2026'],
    ['de', '13. Aug. 2026'],
    ['fr', '13 août 2026'],
    ['es', '13 ago 2026'],
  ] as const)('%s names the month in its own language', (language, expected) => {
    applyLanguage(language);
    expect(formatDate(DATE)).toBe(expected);
  });

  it('keeps Arabic on the Gregorian calendar', () => {
    // `ar` resolves to the Umm al-Qura calendar in some regions, which would
    // print a year the stored ISO date does not mean.
    applyLanguage('ar');
    expect(formatDate(DATE)).toContain('2026');
  });
});

describe('Arabic figures', () => {
  it('uses Latin digits, so a money field can read its own output back', () => {
    applyLanguage('ar');
    expect(formatMoney(AMOUNT)).toMatch(/\d/);
    // Arabic-Indic digits U+0660–U+0669 would be unreadable to `parseMoneyInput`.
    expect(formatMoney(AMOUNT)).not.toMatch(/[٠-٩]/);
  });
});

describe('the language table', () => {
  it('gives every supported language a locale and a native name', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_LOCALES[language]).toBeTruthy();
      expect(LANGUAGE_NATIVE_NAMES[language]).toBeTruthy();
    }
  });

  it('names each language in itself, not in English', () => {
    // A list of languages is the one place translation would defeat the purpose.
    expect(LANGUAGE_NATIVE_NAMES.de).toBe('Deutsch');
    expect(LANGUAGE_NATIVE_NAMES.es).toBe('Español');
    expect(LANGUAGE_NATIVE_NAMES.ar).toBe('العربية');
  });
});

describe('resolving a preference', () => {
  it('passes a chosen language straight through', () => {
    expect(resolveLanguage('de')).toBe('de');
  });

  it('resolves `system` to something the app actually ships', () => {
    // This runs at launch, above the database gate, before anything is stored.
    // A device set to a language the app does not have must land on English
    // rather than on an undefined that would reach `LANGUAGE_LOCALES`.
    expect(SUPPORTED_LANGUAGES).toContain(resolveLanguage('system'));
    expect(SUPPORTED_LANGUAGES).toContain(resolveDeviceLanguage());
  });
});

import { CURRENCIES, SUGGESTED_CURRENCIES, SUPPORTED_CURRENCIES } from '@/constants/currencies';
import { applyLanguage, SUPPORTED_LANGUAGES } from '@/i18n';
import type { LanguageCode } from '@/types/domain';

import {
  centsToInputString,
  currencyAdornment,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPercent,
  parseMoneyInput,
} from './currency';
import { setActiveLocale } from './locale';

/**
 * ICU separates the currency code from the amount with a non-breaking space,
 * where the old symbol form had no separator at all in `en-GB`. Spelling it out
 * keeps these assertions exact — this file is the one that should notice if it
 * ever changes.
 */
const NBSP = ' ';

describe('formatMoney', () => {
  it('hides decimals on round amounts and shows them otherwise', () => {
    expect(formatMoney(165_000)).toBe(`EUR${NBSP}1,650`);
    expect(formatMoney(1_799)).toBe(`EUR${NBSP}17.99`);
  });

  it('can be forced to always or never show decimals', () => {
    expect(formatMoney(165_000, { decimals: 'always' })).toBe(`EUR${NBSP}1,650.00`);
    expect(formatMoney(1_799, { decimals: 'never' })).toBe(`EUR${NBSP}18`);
  });

  it('formats negative amounts with a sign', () => {
    expect(formatMoney(-78_300)).toBe(`-EUR${NBSP}783`);
  });

  it('adds a plus sign only when asked, and only for positive amounts', () => {
    // Both signs land in front of the code: the plus because `formatMoney`
    // prepends it to the whole string, the minus because ICU puts it there.
    expect(formatMoney(21_000, { signDisplay: true })).toBe(`+EUR${NBSP}210`);
    expect(formatMoney(-21_000, { signDisplay: true })).toBe(`-EUR${NBSP}210`);
    expect(formatMoney(0, { signDisplay: true })).toBe(`EUR${NBSP}0`);
  });

  it('rounds fractional cents at the point of display', () => {
    // A derived rate such as cost per use is not an integer.
    expect(formatMoney(276.769, { decimals: 'always' })).toBe(`EUR${NBSP}2.77`);
  });

  it('shows a placeholder instead of NaN or Infinity', () => {
    expect(formatMoney(Number.NaN)).toBe('—');
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('follows the active currency', () => {
    expect(formatMoney(1_799, { currency: 'USD' })).toBe(`USD${NBSP}17.99`);
    expect(formatMoney(1_799, { currency: 'GBP' })).toBe(`GBP${NBSP}17.99`);
  });

  it('follows the active locale', () => {
    setActiveLocale('de-DE');
    // Normalise the whitespace so the assertion is about grouping, separators
    // and which side the code sits on, not about whitespace bytes.
    const normalise = (value: string): string => value.replace(/\s/g, ' ');

    expect(normalise(formatMoney(165_000))).toBe('1.650 EUR');
    expect(normalise(formatMoney(1_799))).toBe('17,99 EUR');
  });
});

describe('formatMoneyCompact', () => {
  it('uses the standard format below the compact threshold', () => {
    expect(formatMoneyCompact(482_000)).toBe(`EUR${NBSP}4,820`);
  });

  it('compacts large amounts', () => {
    expect(formatMoneyCompact(1_200_000_00)).toContain('M');
  });
});

describe('every currency the app offers', () => {
  /**
   * The rule is symbols for all of them or for none, and there is no complete
   * symbol set to draw on: ICU already writes CHF as `CHF`, USD as `US$` and
   * most Arab-state currencies as their code. So it is codes, everywhere, in
   * every language — and this is what proves ICU agrees.
   */
  it('is named by its ISO code, in every language', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      applyLanguage(language);
      for (const { code } of CURRENCIES) {
        expect([language, code, currencyAdornment(code).code]).toEqual([language, code, code]);
      }
    }

    applyLanguage('en');
  });

  it('never renders a currency symbol', () => {
    for (const { code } of CURRENCIES) {
      expect(formatMoney(165_000, { currency: code })).not.toMatch(/[€$£¥₪₩₽₺]/u);
    }
  });

  /**
   * Which side the code sits on is a property of the locale, not of the
   * currency: English puts it in front and the other five put it after the
   * amount, for all of them. `MoneyField` renders its adornment from this.
   */
  it('sits on the same side of the amount within a language', () => {
    const expected: Record<LanguageCode, 'prefix' | 'suffix'> = {
      en: 'prefix',
      it: 'suffix',
      de: 'suffix',
      fr: 'suffix',
      es: 'suffix',
      ar: 'suffix',
    };

    for (const language of SUPPORTED_LANGUAGES) {
      applyLanguage(language);
      for (const { code } of CURRENCIES) {
        expect([language, code, currencyAdornment(code).position]).toEqual([
          language,
          code,
          expected[language],
        ]);
      }
    }

    applyLanguage('en');
  });
});

describe('minor units', () => {
  /**
   * KWD, BHD, OMR, JOD, LYD and TND are defined with three decimals, and DJF,
   * KMF, IQD, SOS, SYP and LBP with none. The app shows all of them with two,
   * on purpose — see `MINOR_UNITS_PER_MAJOR`.
   */
  it('shows two decimals where ISO defines three', () => {
    for (const code of ['KWD', 'BHD', 'OMR', 'JOD', 'LYD', 'TND'] as const) {
      expect(formatMoney(1_799, { currency: code, decimals: 'always' })).toBe(
        `${code}${NBSP}17.99`,
      );
    }
  });

  it('shows two decimals where ISO defines none', () => {
    for (const code of ['DJF', 'KMF', 'IQD', 'SOS', 'SYP', 'LBP'] as const) {
      expect(formatMoney(1_799, { currency: code, decimals: 'always' })).toBe(
        `${code}${NBSP}17.99`,
      );
    }
  });

  /**
   * The invariant the whole decision rests on: changing currency relabels a
   * figure and never changes it. Stored money is not converted, so the digits
   * have to come out identical under every code the app offers.
   */
  it('relabels an amount without changing it', () => {
    const digitsOnly = (text: string): string => text.replace(/[^\d.,]/g, '');
    const reference = digitsOnly(formatMoney(165_000));

    for (const { code } of CURRENCIES) {
      expect([code, digitsOnly(formatMoney(165_000, { currency: code }))]).toEqual([
        code,
        reference,
      ]);
    }
  });
});

describe('the currency table', () => {
  it('lists each currency exactly once', () => {
    expect(new Set(SUPPORTED_CURRENCIES).size).toBe(CURRENCIES.length);
  });

  it('uses codes ICU can format', () => {
    for (const { code } of CURRENCIES) {
      expect(code).toMatch(/^[A-Z]{3}$/);
      expect(() =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).format(0),
      ).not.toThrow();
    }
  });

  it('suggests only currencies it offers, for every language', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      const suggested = SUGGESTED_CURRENCIES[language];

      expect([language, suggested.length > 0]).toEqual([language, true]);
      expect([language, new Set(suggested).size]).toEqual([language, suggested.length]);

      for (const code of suggested) {
        expect([language, code, SUPPORTED_CURRENCIES.includes(code)]).toEqual([
          language,
          code,
          true,
        ]);
      }
    }
  });
});

describe('parseMoneyInput', () => {
  it('parses plain integers as whole units', () => {
    expect(parseMoneyInput('1799')).toBe(179_900);
  });

  it('parses either decimal separator', () => {
    expect(parseMoneyInput('17.99')).toBe(1_799);
    expect(parseMoneyInput('17,99')).toBe(1_799);
  });

  it('parses grouped amounts in both conventions', () => {
    expect(parseMoneyInput('1.234,56')).toBe(123_456);
    expect(parseMoneyInput('1,234.56')).toBe(123_456);
  });

  it('treats a three-digit group as thousands, not a fraction', () => {
    expect(parseMoneyInput('1,500')).toBe(150_000);
    expect(parseMoneyInput('1.500')).toBe(150_000);
  });

  it('pads a single decimal digit', () => {
    expect(parseMoneyInput('17,9')).toBe(1_790);
  });

  it('ignores currency symbols and whitespace', () => {
    // A pasted `€` is still realistic input even though the app no longer emits
    // one; anything that is not a digit or a separator is dropped either way.
    expect(parseMoneyInput('€ 17.99')).toBe(1_799);
    expect(parseMoneyInput('  1799 EUR ')).toBe(179_900);
  });

  it('handles negative amounts', () => {
    expect(parseMoneyInput('-17.99')).toBe(-1_799);
  });

  it('returns null for anything unusable, rather than NaN', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('   ')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('-')).toBeNull();
    expect(parseMoneyInput('.')).toBeNull();
  });

  it('parses a bare fraction', () => {
    expect(parseMoneyInput('.99')).toBe(99);
    expect(parseMoneyInput('0.05')).toBe(5);
  });

  it('round-trips through the input formatter', () => {
    for (const cents of [0, 5, 99, 1_799, 165_000, 1_234_56]) {
      expect(parseMoneyInput(centsToInputString(cents))).toBe(cents);
    }
  });

  it('round-trips in every language the app ships', () => {
    // What a money field does on blur: format the stored cents into text, parse
    // the text back. If a locale emits a decimal separator or a digit the parser
    // does not read, the field clears itself and the amount is silently lost —
    // which is exactly what `ar` does unless its numbering system is pinned to
    // Latin digits.
    for (const language of SUPPORTED_LANGUAGES) {
      applyLanguage(language);
      for (const cents of [1, 99, 1_799, 165_000, 1_234_56]) {
        expect([language, parseMoneyInput(centsToInputString(cents))]).toEqual([language, cents]);
      }
    }

    applyLanguage('en');
  });

  it('reads back an amount copied out of the app', () => {
    // Money now reads `EUR 1,650`, and the space in it is a non-breaking one.
    // Someone copying a figure out of a list and into a money field must not
    // lose it to the code or to that space.
    for (const language of SUPPORTED_LANGUAGES) {
      applyLanguage(language);
      for (const cents of [1_799, 165_000]) {
        expect([language, cents, parseMoneyInput(formatMoney(cents))]).toEqual([
          language,
          cents,
          cents,
        ]);
      }
    }

    applyLanguage('en');
  });
});

describe('centsToInputString', () => {
  it('omits decimals for round amounts', () => {
    expect(centsToInputString(165_000)).toBe('1650');
  });

  it('keeps two decimals otherwise, without grouping', () => {
    expect(centsToInputString(1_799)).toBe('17.99');
  });

  it('returns an empty string for no value', () => {
    expect(centsToInputString(null)).toBe('');
    expect(centsToInputString(undefined)).toBe('');
    expect(centsToInputString(Number.NaN)).toBe('');
  });
});

describe('formatPercent', () => {
  it('formats a ratio as a percentage', () => {
    expect(formatPercent(1.09)).toBe('109%');
    expect(formatPercent(2.0749)).toBe('207%');
  });

  it('shows a placeholder for a missing or non-finite ratio', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(Number.NaN)).toBe('—');
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatNumber', () => {
  it('formats with locale grouping', () => {
    expect(formatNumber(650)).toBe('650');
    expect(formatNumber(2.07, 1)).toBe('2.1');
  });

  it('shows a placeholder for a missing value', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(Number.NaN)).toBe('—');
  });
});

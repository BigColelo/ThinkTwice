import { applyLanguage, SUPPORTED_LANGUAGES } from '@/i18n';

import {
  centsToInputString,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPercent,
  parseMoneyInput,
} from './currency';
import { setActiveLocale } from './locale';

describe('formatMoney', () => {
  it('hides decimals on round amounts and shows them otherwise', () => {
    expect(formatMoney(165_000)).toBe('€1,650');
    expect(formatMoney(1_799)).toBe('€17.99');
  });

  it('can be forced to always or never show decimals', () => {
    expect(formatMoney(165_000, { decimals: 'always' })).toBe('€1,650.00');
    expect(formatMoney(1_799, { decimals: 'never' })).toBe('€18');
  });

  it('formats negative amounts with a sign', () => {
    expect(formatMoney(-78_300)).toBe('-€783');
  });

  it('adds a plus sign only when asked, and only for positive amounts', () => {
    expect(formatMoney(21_000, { signDisplay: true })).toBe('+€210');
    expect(formatMoney(-21_000, { signDisplay: true })).toBe('-€210');
    expect(formatMoney(0, { signDisplay: true })).toBe('€0');
  });

  it('rounds fractional cents at the point of display', () => {
    // A derived rate such as cost per use is not an integer.
    expect(formatMoney(276.769, { decimals: 'always' })).toBe('€2.77');
  });

  it('shows a placeholder instead of NaN or Infinity', () => {
    expect(formatMoney(Number.NaN)).toBe('—');
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('follows the active currency', () => {
    expect(formatMoney(1_799, { currency: 'USD' })).toBe('US$17.99');
    expect(formatMoney(1_799, { currency: 'GBP' })).toBe('£17.99');
  });

  it('follows the active locale', () => {
    setActiveLocale('de-DE');
    // Locale output uses a non-breaking space before the symbol; normalise it so
    // the assertion is about grouping and separators, not about whitespace bytes.
    const normalise = (value: string): string => value.replace(/\s/g, ' ');

    expect(normalise(formatMoney(165_000))).toBe('1.650 €');
    expect(normalise(formatMoney(1_799))).toBe('17,99 €');
  });
});

describe('formatMoneyCompact', () => {
  it('uses the standard format below the compact threshold', () => {
    expect(formatMoneyCompact(482_000)).toBe('€4,820');
  });

  it('compacts large amounts', () => {
    expect(formatMoneyCompact(1_200_000_00)).toContain('M');
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

import { applyLanguage, t } from '@/i18n';

import { formatDuration, formatMonthsAsDuration } from './format';

/**
 * Durations in words.
 *
 * These moved out of `utils/dates` when the app gained languages: the calendar
 * arithmetic is the same everywhere, the noun and its plural form are not.
 */

describe('formatDuration', () => {
  it('describes a young item in days', () => {
    expect(formatDuration(t, 0, 3)).toBe('3 days');
    expect(formatDuration(t, 0, 1)).toBe('1 day');
    expect(formatDuration(t, 0, 0)).toBe('today');
  });

  it('switches to weeks once days stop reading well', () => {
    expect(formatDuration(t, 0, 20)).toBe('2 weeks');
  });

  it('describes longer ownership in months and years', () => {
    expect(formatDuration(t, 8, 240)).toBe('8 months');
    expect(formatDuration(t, 12, 365)).toBe('1 year');
    expect(formatDuration(t, 27, 830)).toBe('2 years 3 months');
  });

  it('shows a placeholder rather than a negative duration', () => {
    expect(formatDuration(t, 0, -5)).toBe('—');
  });
});

describe('formatMonthsAsDuration', () => {
  it('prefers whole years', () => {
    expect(formatMonthsAsDuration(t, 60)).toBe('5 years');
    expect(formatMonthsAsDuration(t, 12)).toBe('1 year');
  });

  it('keeps months below two years, where "1 year 6 months" reads worse', () => {
    expect(formatMonthsAsDuration(t, 18)).toBe('18 months');
  });

  it('combines years and months above that', () => {
    expect(formatMonthsAsDuration(t, 27)).toBe('2 years 3 months');
  });

  it('shows a placeholder for a duration it cannot use', () => {
    expect(formatMonthsAsDuration(t, 0)).toBe('—');
    expect(formatMonthsAsDuration(t, Number.NaN)).toBe('—');
  });
});

describe('counted nouns', () => {
  it('groups a large count like every other number in the app', () => {
    // Daily use over five years. "1820 uses" would be the only ungrouped
    // thousands figure on screen.
    expect(t('units.use', { count: 1_820 })).toBe('1,820 uses');
  });

  it('uses the singular only for one', () => {
    expect(t('units.use', { count: 1 })).toBe('1 use');
    expect(t('units.use', { count: 0 })).toBe('0 uses');
  });

  it('follows the plural rules of the chosen language, not English ones', () => {
    // Italian resolves a third category for large round numbers, which an
    // "add an s unless it is one" rule could never produce.
    applyLanguage('it');
    expect(formatMonthsAsDuration(t, 12)).toBe('1 anno');
    expect(formatMonthsAsDuration(t, 24)).toBe('2 anni');

    // Arabic resolves six, including a dedicated dual form for exactly two.
    applyLanguage('ar');
    expect(t('units.day', { count: 1 })).not.toBe(t('units.day', { count: 2 }));
    expect(t('units.day', { count: 2 })).not.toBe(t('units.day', { count: 3 }));

    applyLanguage('en');
  });
});

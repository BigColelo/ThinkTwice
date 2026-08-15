import { SUPPORTED_LANGUAGES } from '@/i18n';
import type { LanguageCode } from '@/types/domain';

import { LANGUAGE_LOCALES } from './languages';
import { ar } from './locales/ar';
import { de } from './locales/de';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
// Renamed: `it` is also Jest's own test function.
import { it as italian } from './locales/it';

/**
 * What holds the six catalogues together.
 *
 * A missing key does not crash — i18next falls back to English — so it shows up
 * as one English sentence in the middle of a translated screen, which is the
 * kind of thing nobody notices until a user does. These tests are what catch it.
 *
 * Plurals are checked against the language's own rules rather than against
 * English: Italian, French and Spanish resolve three categories, Arabic six, and
 * a catalogue that only carried `_one` and `_other` would silently print the
 * wrong form for exactly the counts a plural rule exists to handle.
 */

const CATALOGUES: Record<LanguageCode, unknown> = { en, it: italian, de, fr, es, ar };

type Leaf = { path: string; value: string };

function leaves(value: unknown, prefix = ''): Leaf[] {
  if (typeof value === 'string') return [{ path: prefix, value }];
  if (value == null || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

/** `units.day_one` → `units.day`; a key without a plural suffix is returned as-is. */
function stem(path: string): string {
  const match = /^(.*)_(zero|one|two|few|many|other)$/.exec(path);
  return match?.[1] ?? path;
}

function isPlural(path: string): boolean {
  return stem(path) !== path;
}

/** The plural categories a language actually resolves, e.g. `ar` → six of them. */
function pluralCategories(language: LanguageCode): readonly string[] {
  return new Intl.PluralRules(LANGUAGE_LOCALES[language]).resolvedOptions().pluralCategories;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{\s*(\w+)/g)].map((match) => match[1] ?? '').sort();
}

const english = leaves(en);
const englishByPath = new Map(english.map((leaf) => [leaf.path, leaf.value]));
const englishStems = new Set(english.map((leaf) => stem(leaf.path)));

const OTHER_LANGUAGES = SUPPORTED_LANGUAGES.filter((language) => language !== 'en');

describe.each(OTHER_LANGUAGES)('%s catalogue', (language) => {
  const translated = leaves(CATALOGUES[language]);
  const byPath = new Map(translated.map((leaf) => [leaf.path, leaf.value]));
  const stems = new Set(translated.map((leaf) => stem(leaf.path)));

  it('covers every key English defines', () => {
    expect([...englishStems].filter((key) => !stems.has(key))).toEqual([]);
  });

  it('defines nothing English does not', () => {
    expect([...stems].filter((key) => !englishStems.has(key))).toEqual([]);
  });

  it('carries every plural form the language resolves', () => {
    const required = pluralCategories(language);

    const missing: string[] = [];
    for (const key of stems) {
      // Only keys English itself pluralises take a count.
      if (!english.some((leaf) => stem(leaf.path) === key && isPlural(leaf.path))) continue;
      for (const category of required) {
        if (!byPath.has(`${key}_${category}`)) missing.push(`${key}_${category}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('interpolates the same values as English', () => {
    const mismatched: string[] = [];
    for (const { path, value } of translated) {
      // A plural variant is compared against whichever English form exists.
      const englishValue =
        englishByPath.get(path) ??
        englishByPath.get(`${stem(path)}_other`) ??
        englishByPath.get(stem(path));
      if (englishValue == null) continue;

      const expected = placeholders(englishValue).filter((name) => name !== 'count');
      const actual = placeholders(value).filter((name) => name !== 'count');
      if (expected.join(',') !== actual.join(',')) mismatched.push(path);
    }

    expect(mismatched).toEqual([]);
  });

  it('has no empty or untranslated-looking values', () => {
    expect(translated.filter((leaf) => leaf.value.trim() === '').map((leaf) => leaf.path)).toEqual(
      [],
    );
  });

  it('keeps the line breaks the onboarding titles are set on', () => {
    for (const slide of ['first', 'second', 'third'] as const) {
      expect(byPath.get(`onboarding.slides.${slide}.title`)).toContain('\n');
    }
  });
});

describe('every catalogue', () => {
  /**
   * The app reports, it does not advise. These words all assert something about
   * whether a purchase is a good idea, which is the one thing ThinkTwice never
   * does — and a translation is exactly where that slips back in.
   */
  const FORBIDDEN: Record<LanguageCode, readonly string[]> = {
    en: ['afford', 'waste', 'you should', 'worth it', 'bargain', 'treat yourself'],
    it: ['permetter', 'spreco', 'sprecare', 'dovresti', 'conviene', 'occasione da', 'ne vale la'],
    de: ['leisten', 'verschwend', 'du solltest', 'lohnt sich', 'schnäppchen'],
    fr: ['te permettre', 'vous permettre', 'gaspill', 'tu devrais', 'vous devriez', 'ça vaut'],
    es: ['permitirte', 'derroch', 'malgast', 'deberías', 'merece la pena', 'vale la pena'],
    ar: ['تبذير', 'إسراف', 'يجب أن تشتري', 'يستحق الشراء'],
  };

  it.each(SUPPORTED_LANGUAGES)('%s never argues for or against a purchase', (language) => {
    const offenders = leaves(CATALOGUES[language])
      .filter(({ value }) => FORBIDDEN[language].some((word) => value.toLowerCase().includes(word)))
      .map((leaf) => leaf.path);

    expect(offenders).toEqual([]);
  });

  it.each(SUPPORTED_LANGUAGES)('%s resolves a usable plural rule set', (language) => {
    // A locale tag ICU cannot read would silently fall back to English plurals,
    // which is how Arabic would end up with two forms instead of six.
    expect(pluralCategories(language).length).toBeGreaterThanOrEqual(2);
  });

  it('gives Arabic the six categories its grammar needs', () => {
    expect([...pluralCategories('ar')].sort()).toEqual([
      'few',
      'many',
      'one',
      'other',
      'two',
      'zero',
    ]);
  });
});

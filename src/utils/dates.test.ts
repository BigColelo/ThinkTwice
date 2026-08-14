import {
  addDays,
  addMonths,
  calendarDaysBetween,
  calendarMonthsBetween,
  formatDate,
  formatDuration,
  formatMonthsAsDuration,
  parseIso,
  parseIsoDate,
  pluralize,
  toIsoDate,
} from './dates';

describe('parseIso', () => {
  it('parses a stored timestamp', () => {
    expect(parseIso('2026-08-13T09:00:00.000Z')?.toISOString()).toBe('2026-08-13T09:00:00.000Z');
  });

  it('returns null for anything unusable rather than an Invalid Date', () => {
    expect(parseIso('not-a-date')).toBeNull();
    expect(parseIso('')).toBeNull();
    expect(parseIso(null)).toBeNull();
    expect(parseIso(undefined)).toBeNull();
  });
});

describe('toIsoDate and parseIsoDate', () => {
  it('round-trips a calendar date using local fields', () => {
    const date = new Date(2026, 7, 13, 23, 30);
    expect(toIsoDate(date)).toBe('2026-08-13');
    expect(parseIsoDate('2026-08-13')?.getDate()).toBe(13);
    expect(parseIsoDate('2026-08-13')?.getMonth()).toBe(7);
  });

  it('does not shift the day for a late-evening local time', () => {
    // Formatting via UTC would report the 14th in positive offsets.
    const date = new Date(2026, 7, 13, 23, 59, 59);
    expect(toIsoDate(date)).toBe('2026-08-13');
  });

  it('returns null for an unusable value', () => {
    expect(parseIsoDate('nonsense')).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
  });
});

describe('calendar arithmetic', () => {
  it('counts whole calendar days', () => {
    expect(calendarDaysBetween(new Date(2026, 7, 13), new Date(2026, 7, 20))).toBe(7);
    expect(calendarDaysBetween(new Date(2026, 7, 20), new Date(2026, 7, 13))).toBe(-7);
  });

  it('counts whole calendar months', () => {
    expect(calendarMonthsBetween(new Date(2025, 11, 13), new Date(2026, 7, 13))).toBe(8);
  });

  it('adds days across a month boundary', () => {
    expect(toIsoDate(addDays(new Date(2026, 0, 30), 3))).toBe('2026-02-02');
  });

  it('adds months without overflowing a short month', () => {
    expect(toIsoDate(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
  });
});

describe('formatDuration', () => {
  it('describes a short period in days', () => {
    expect(formatDuration(0, 3)).toBe('3 days');
    expect(formatDuration(0, 1)).toBe('1 day');
    expect(formatDuration(0, 0)).toBe('today');
  });

  it('switches to weeks between two weeks and a month', () => {
    expect(formatDuration(0, 20)).toBe('2 weeks');
  });

  it('describes months and years', () => {
    expect(formatDuration(8, 240)).toBe('8 months');
    expect(formatDuration(12, 365)).toBe('1 year');
    expect(formatDuration(27, 830)).toBe('2 years 3 months');
  });

  it('returns a placeholder for an impossible duration', () => {
    expect(formatDuration(0, -5)).toBe('—');
  });
});

describe('formatMonthsAsDuration', () => {
  it('prefers years when the duration divides evenly', () => {
    expect(formatMonthsAsDuration(60)).toBe('5 years');
    expect(formatMonthsAsDuration(12)).toBe('1 year');
  });

  it('uses months below two years', () => {
    expect(formatMonthsAsDuration(18)).toBe('18 months');
  });

  it('combines years and months above two years', () => {
    expect(formatMonthsAsDuration(27)).toBe('2 years 3 months');
  });

  it('returns a placeholder for a non-positive duration', () => {
    expect(formatMonthsAsDuration(0)).toBe('—');
    expect(formatMonthsAsDuration(Number.NaN)).toBe('—');
  });
});

describe('formatDate', () => {
  it('formats a calendar date for display', () => {
    expect(formatDate('2026-08-13')).toBe('13 Aug 2026');
  });

  it('shows a placeholder rather than "Invalid Date"', () => {
    expect(formatDate('nonsense')).toBe('—');
    expect(formatDate(null)).toBe('—');
  });
});

describe('pluralize', () => {
  it('pluralises everything except one', () => {
    expect(pluralize(1, 'use')).toBe('1 use');
    expect(pluralize(0, 'use')).toBe('0 uses');
    expect(pluralize(58, 'use')).toBe('58 uses');
  });

  it('groups a large count like every other number in the app', () => {
    // Daily use over five years. "1820 uses" would be the only ungrouped
    // thousands figure on screen.
    expect(pluralize(1_820, 'use')).toBe('1,820 uses');
  });

  it('renders a dash rather than NaN for a count it cannot use', () => {
    expect(pluralize(Number.NaN, 'use')).toBe('— uses');
  });
});

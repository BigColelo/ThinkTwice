import {
  addDays,
  addMonths,
  calendarDaysBetween,
  calendarMonthsBetween,
  formatDate,
  parseIso,
  parseIsoDate,
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

describe('formatDate', () => {
  it('formats a calendar date for display', () => {
    expect(formatDate('2026-08-13')).toBe('13 Aug 2026');
  });

  it('shows a placeholder rather than "Invalid Date"', () => {
    expect(formatDate('nonsense')).toBe('—');
    expect(formatDate(null)).toBe('—');
  });
});

import type { MonthlyFinances } from '@/domain/money/calculations';

import {
  calculateCooldownEnd,
  calculateCooldownState,
  formatCooldownRemaining,
  formatCooldownRemainingShort,
  MAX_COOLDOWN_DAYS,
  MIN_COOLDOWN_DAYS,
  suggestCooldownDays,
} from './cooldown';

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDaysFrom(reference: Date, days: number): string {
  return new Date(reference.getTime() + days * DAY_MS).toISOString();
}

describe('calculateCooldownEnd', () => {
  it('adds the requested number of days', () => {
    const start = new Date('2026-08-13T09:00:00.000Z');
    const { startedAt, endsAt } = calculateCooldownEnd(7, start);

    expect(startedAt).toBe('2026-08-13T09:00:00.000Z');
    expect(endsAt).toBe('2026-08-20T09:00:00.000Z');
  });

  it('clamps the period to the supported range', () => {
    const start = new Date('2026-08-13T09:00:00.000Z');

    // Compared in calendar days rather than milliseconds: the period keeps the
    // same wall-clock time, so a daylight-saving change shifts the UTC delta by
    // an hour without changing how many days the user was given.
    const daysBetween = (isoEnd: string): number =>
      Math.round((Date.parse(isoEnd) - start.getTime()) / DAY_MS);

    expect(daysBetween(calculateCooldownEnd(0, start).endsAt)).toBe(MIN_COOLDOWN_DAYS);
    expect(daysBetween(calculateCooldownEnd(9999, start).endsAt)).toBe(MAX_COOLDOWN_DAYS);
  });
});

describe('calculateCooldownState', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');

  it('reports the days remaining for a period in progress', () => {
    const state = calculateCooldownState(
      {
        cooldownDays: 7,
        cooldownStartedAt: isoDaysFrom(now, -1),
        cooldownEndsAt: isoDaysFrom(now, 6),
      },
      now,
    );

    expect(state.daysRemaining).toBe(6);
    expect(state.isComplete).toBe(false);
    expect(state.progress).toBeCloseTo(1 / 7, 6);
  });

  it('completes exactly at the end instant', () => {
    const state = calculateCooldownState(
      {
        cooldownDays: 7,
        cooldownStartedAt: isoDaysFrom(now, -7),
        cooldownEndsAt: now.toISOString(),
      },
      now,
    );

    expect(state.isComplete).toBe(true);
    expect(state.daysRemaining).toBe(0);
    expect(state.progress).toBe(1);
  });

  it('stays complete long after the end, without going past full progress', () => {
    const state = calculateCooldownState(
      {
        cooldownDays: 7,
        cooldownStartedAt: isoDaysFrom(now, -60),
        cooldownEndsAt: isoDaysFrom(now, -53),
      },
      now,
    );

    expect(state.isComplete).toBe(true);
    expect(state.progress).toBe(1);
    expect(state.daysRemaining).toBe(0);
  });

  it('rounds a partial final day up rather than to zero', () => {
    const state = calculateCooldownState(
      {
        cooldownDays: 7,
        cooldownStartedAt: isoDaysFrom(now, -6.5),
        cooldownEndsAt: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      },
      now,
    );

    expect(state.daysRemaining).toBe(1);
    expect(state.hoursRemaining).toBe(6);
  });

  it('treats unreadable dates as a completed period rather than trapping the user', () => {
    const state = calculateCooldownState(
      { cooldownDays: 7, cooldownStartedAt: 'not-a-date', cooldownEndsAt: 'also-not-a-date' },
      now,
    );

    expect(state.isComplete).toBe(true);
    expect(state.progress).toBe(1);
  });

  it.each([
    ['spring forward', 2, 25], // late March, DST starts in most northern zones
    ['autumn back', 9, 22], // late October, DST ends
  ])('reports the full period on the day it starts, across a %s change', (_label, month, day) => {
    // Built with calendar arithmetic exactly as `calculateCooldownEnd` does, so
    // in a DST-observing timezone the real elapsed time is 167h or 169h rather
    // than 168h. The user was still given seven days.
    const startedAt = new Date(2026, month, day, 9, 0, 0);
    const endsAt = new Date(2026, month, day + 7, 9, 0, 0);

    const state = calculateCooldownState(
      {
        cooldownDays: 7,
        cooldownStartedAt: startedAt.toISOString(),
        cooldownEndsAt: endsAt.toISOString(),
      },
      startedAt,
    );

    expect(state.daysRemaining).toBe(7);
    expect(state.isComplete).toBe(false);
  });

  it('clamps progress for a period that has not started yet', () => {
    const state = calculateCooldownState(
      {
        cooldownDays: 7,
        cooldownStartedAt: isoDaysFrom(now, 1),
        cooldownEndsAt: isoDaysFrom(now, 8),
      },
      now,
    );

    expect(state.progress).toBe(0);
    expect(state.isComplete).toBe(false);
  });
});

describe('formatCooldownRemaining', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');

  const stateAt = (endOffsetDays: number) =>
    calculateCooldownState(
      {
        cooldownDays: 7,
        cooldownStartedAt: isoDaysFrom(now, -7 + endOffsetDays),
        cooldownEndsAt: isoDaysFrom(now, endOffsetDays),
      },
      now,
    );

  it('describes multiple days remaining', () => {
    expect(formatCooldownRemaining(stateAt(6))).toBe('6 days remaining');
    expect(formatCooldownRemainingShort(stateAt(6))).toBe('6 days left');
  });

  it('switches to hours on the final day', () => {
    expect(formatCooldownRemaining(stateAt(0.25))).toBe('6 hours remaining');
  });

  it('states plainly when the period is over', () => {
    expect(formatCooldownRemaining(stateAt(-1))).toBe('Reflection period complete');
    expect(formatCooldownRemainingShort(stateAt(-1))).toBe('Ready to decide');
  });
});

describe('suggestCooldownDays', () => {
  const finances: MonthlyFinances = {
    netIncomeCents: 165_000,
    commitmentsCents: 78_300,
    savingsTargetCents: null,
    availableAfterCommitmentsCents: 86_700,
    availableAfterSavingsGoalCents: null,
    availableToIncomeRatio: 0.52,
    commitmentsToIncomeRatio: 0.47,
    isIncomeConfigured: true,
    commitmentsExceedIncome: false,
  };

  it('suggests a longer period as the price grows relative to available money', () => {
    const suggestions = [
      suggestCooldownDays(1_000, finances).days,
      suggestCooldownDays(10_000, finances).days,
      suggestCooldownDays(40_000, finances).days,
      suggestCooldownDays(100_000, finances).days,
      suggestCooldownDays(179_900, finances).days,
    ];

    expect(suggestions).toEqual([1, 3, 7, 14, 30]);
    // Monotonic: a larger price never suggests a shorter period.
    for (let i = 1; i < suggestions.length; i += 1) {
      expect(suggestions[i]).toBeGreaterThanOrEqual(suggestions[i - 1] as number);
    }
  });

  it('falls back to absolute price bands when there is no available money', () => {
    const withoutIncome = {
      ...finances,
      isIncomeConfigured: false,
      availableAfterCommitmentsCents: 0,
    };

    expect(suggestCooldownDays(1_000, withoutIncome).days).toBe(1);
    expect(suggestCooldownDays(179_900, withoutIncome).days).toBe(30);
    expect(suggestCooldownDays(1_000, withoutIncome).rationale).toContain('no income is set');
  });

  it('always explains itself and always returns a supported period', () => {
    for (const price of [0, 500, 5_000, 50_000, 500_000, 5_000_000]) {
      const suggestion = suggestCooldownDays(price, finances);
      expect(suggestion.rationale.length).toBeGreaterThan(0);
      expect(suggestion.days).toBeGreaterThanOrEqual(MIN_COOLDOWN_DAYS);
      expect(suggestion.days).toBeLessThanOrEqual(MAX_COOLDOWN_DAYS);
    }
  });

  it('handles a null financial picture', () => {
    expect(suggestCooldownDays(10_000, null).days).toBe(3);
  });
});

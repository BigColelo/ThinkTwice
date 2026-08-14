import type { MonthlyFinances } from '@/domain/money/calculations';

import {
  calculateCooldownEnd,
  calculateCooldownState,
  formatCooldownRemaining,
  formatCooldownRemainingShort,
  MAX_COOLDOWN_DAYS,
  MIN_COOLDOWN_DAYS,
  reviseCooldownForPrice,
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

describe('reviseCooldownForPrice', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');

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

  /** Whole days between the original start and the revised end. */
  const periodLength = (startedAt: string, endsAt: string): number =>
    Math.round((Date.parse(endsAt) - Date.parse(startedAt)) / DAY_MS);

  it('extends the period from its original start when the price grows into a longer band', () => {
    const startedAt = isoDaysFrom(now, -1);

    const revision = reviseCooldownForPrice(
      {
        cooldownDays: 3,
        cooldownStartedAt: startedAt,
        previousPriceCents: 5_000,
        newPriceCents: 179_900,
        finances,
      },
      now,
    );

    expect(revision).not.toBeNull();
    expect(revision?.cooldownDays).toBe(30);
    expect(periodLength(startedAt, revision?.cooldownEndsAt ?? '')).toBe(30);
    expect(revision?.isComplete).toBe(false);

    // The day already spent still counts: 29 left, not a fresh 30.
    const state = calculateCooldownState(
      {
        cooldownDays: revision?.cooldownDays ?? 0,
        cooldownStartedAt: startedAt,
        cooldownEndsAt: revision?.cooldownEndsAt ?? '',
      },
      now,
    );
    expect(state.daysRemaining).toBe(29);
  });

  it('shortens the period when the price drops, completing it if enough time has passed', () => {
    const startedAt = isoDaysFrom(now, -5);

    const revision = reviseCooldownForPrice(
      {
        cooldownDays: 30,
        cooldownStartedAt: startedAt,
        previousPriceCents: 179_900,
        newPriceCents: 1_000,
        finances,
      },
      now,
    );

    // A cheaper item does not deserve the longer reflection it was given.
    expect(revision?.cooldownDays).toBe(1);
    expect(revision?.isComplete).toBe(true);
  });

  it('leaves the period alone when the new price falls in the same band', () => {
    expect(
      reviseCooldownForPrice(
        {
          cooldownDays: 7,
          cooldownStartedAt: isoDaysFrom(now, -1),
          previousPriceCents: 40_000,
          newPriceCents: 45_000,
          finances,
        },
        now,
      ),
    ).toBeNull();
  });

  it('leaves the period alone when the price did not change', () => {
    expect(
      reviseCooldownForPrice(
        {
          cooldownDays: 7,
          cooldownStartedAt: isoDaysFrom(now, -1),
          previousPriceCents: 40_000,
          newPriceCents: 40_000,
          finances,
        },
        now,
      ),
    ).toBeNull();
  });

  it('never overrides a period the user chose themselves', () => {
    // 5,000 would have been suggested 3 days; this item carries 14, so the
    // number came from the user and the price has no say over it.
    expect(
      reviseCooldownForPrice(
        {
          cooldownDays: 14,
          cooldownStartedAt: isoDaysFrom(now, -1),
          previousPriceCents: 5_000,
          newPriceCents: 179_900,
          finances,
        },
        now,
      ),
    ).toBeNull();
  });

  it('uses the absolute price bands when there is no financial picture', () => {
    const revision = reviseCooldownForPrice(
      {
        cooldownDays: 1,
        cooldownStartedAt: isoDaysFrom(now, -1),
        previousPriceCents: 1_000,
        newPriceCents: 179_900,
        finances: null,
      },
      now,
    );

    expect(revision?.cooldownDays).toBe(30);
  });

  it('refuses to invent a period from an unreadable start date', () => {
    expect(
      reviseCooldownForPrice(
        {
          cooldownDays: 3,
          cooldownStartedAt: 'not-a-date',
          previousPriceCents: 5_000,
          newPriceCents: 179_900,
          finances,
        },
        now,
      ),
    ).toBeNull();
  });

  it('ignores a non-finite price on either side', () => {
    const base = {
      cooldownDays: 3,
      cooldownStartedAt: isoDaysFrom(now, -1),
      previousPriceCents: 5_000,
      newPriceCents: 179_900,
      finances,
    };

    expect(reviseCooldownForPrice({ ...base, newPriceCents: Number.NaN }, now)).toBeNull();
    expect(
      reviseCooldownForPrice({ ...base, previousPriceCents: Number.POSITIVE_INFINITY }, now),
    ).toBeNull();
  });
});

import type { MonthlyFinances } from '@/domain/money/calculations';
import type { Cents, IsoTimestamp } from '@/types/domain';
import { addDays, parseIso, toIso } from '@/utils/dates';
import { clamp, safeDivide } from '@/utils/numbers';

/**
 * The reflection period.
 *
 * The only persisted values are `cooldownStartedAt`, `cooldownEndsAt` and
 * `cooldownDays`. Nothing counts down on disk: remaining time is always derived
 * from the system clock, so the app is correct after being closed for a week,
 * after a timezone change, and without any background task.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const COOLDOWN_DAY_OPTIONS: readonly number[] = [1, 3, 7, 14, 30];
export const DEFAULT_COOLDOWN_DAYS = 7;
export const MIN_COOLDOWN_DAYS = 1;
export const MAX_COOLDOWN_DAYS = 90;

export type CooldownState = {
  totalDays: number;
  /** Whole days still to go, rounded up. `0` once the period has elapsed. */
  daysRemaining: number;
  /** Hours remaining, for the final day where "0 days" would read wrong. */
  hoursRemaining: number;
  /** 0 → just started, 1 → complete. Drives the progress ring. */
  progress: number;
  isComplete: boolean;
  startedAt: Date | null;
  endsAt: Date | null;
};

export type CooldownInput = {
  cooldownDays: number;
  cooldownStartedAt: IsoTimestamp;
  cooldownEndsAt: IsoTimestamp;
};

/** Computes the live state of a cooldown. `now` is injected so this stays pure. */
export function calculateCooldownState(
  input: CooldownInput,
  now: Date = new Date(),
): CooldownState {
  const startedAt = parseIso(input.cooldownStartedAt);
  const endsAt = parseIso(input.cooldownEndsAt);
  const totalDays = Number.isFinite(input.cooldownDays) ? input.cooldownDays : 0;

  if (!startedAt || !endsAt) {
    // Corrupt or missing dates: treat the reflection period as finished rather
    // than blocking the user behind a countdown that can never end.
    return {
      totalDays,
      daysRemaining: 0,
      hoursRemaining: 0,
      progress: 1,
      isComplete: true,
      startedAt,
      endsAt,
    };
  }

  const remainingMs = endsAt.getTime() - now.getTime();
  const totalMs = endsAt.getTime() - startedAt.getTime();

  const elapsedRatio = safeDivide(now.getTime() - startedAt.getTime(), totalMs);

  // `cooldownEndsAt` is produced by calendar `addDays`, which keeps the same
  // wall-clock time. Across a daylight-saving change the real elapsed time is
  // therefore an hour more or less than a whole number of days, which would
  // round the day count the wrong way — a 7-day period could read "8 days left"
  // the moment it started. Correcting by the offset difference counts the days
  // the user was actually given. Whether the period is *over* still uses real
  // elapsed time, because that is what gates the decision.
  const offsetShiftMs = (endsAt.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
  const wallClockRemainingMs = remainingMs - offsetShiftMs;

  return {
    totalDays,
    daysRemaining: remainingMs <= 0 ? 0 : Math.max(1, Math.ceil(wallClockRemainingMs / MS_PER_DAY)),
    hoursRemaining: remainingMs <= 0 ? 0 : Math.ceil(remainingMs / (60 * 60 * 1000)),
    progress: elapsedRatio == null ? 1 : clamp(elapsedRatio, 0, 1),
    isComplete: remainingMs <= 0,
    startedAt,
    endsAt,
  };
}

/** Computes `cooldownEndsAt` for a period starting now. */
export function calculateCooldownEnd(
  days: number,
  startedAt: Date = new Date(),
): { startedAt: IsoTimestamp; endsAt: IsoTimestamp } {
  const safeDays = clamp(Math.round(days), MIN_COOLDOWN_DAYS, MAX_COOLDOWN_DAYS);
  return {
    startedAt: toIso(startedAt),
    endsAt: toIso(addDays(startedAt, safeDays)),
  };
}

export type CooldownSuggestion = {
  days: number;
  /** Plain-language explanation of how the number was reached. */
  rationale: string;
};

/**
 * Suggests a reflection period from the price.
 *
 * This is a suggestion, not advice, and the user can always override it. It is
 * deterministic and fully described by the thresholds below: larger relative
 * cost → longer default period. When the price cannot be compared to available
 * money (no income set, or commitments consume it all) it falls back to
 * absolute price bands so the suggestion still means something.
 */
export function suggestCooldownDays(
  priceCents: Cents,
  finances: MonthlyFinances | null,
): CooldownSuggestion {
  const price = Number.isFinite(priceCents) ? Math.max(priceCents, 0) : 0;

  const available = finances?.availableAfterCommitmentsCents ?? 0;
  if (finances?.isIncomeConfigured && available > 0) {
    const ratio = price / available;
    if (ratio < 0.05)
      return { days: 1, rationale: 'Small compared to your monthly available amount.' };
    if (ratio < 0.2)
      return { days: 3, rationale: 'Under a fifth of your monthly available amount.' };
    if (ratio < 0.6)
      return { days: 7, rationale: 'A noticeable share of your monthly available amount.' };
    if (ratio < 1.5) return { days: 14, rationale: 'Around a month of your available amount.' };
    return { days: 30, rationale: 'More than a month of your available amount.' };
  }

  if (price < 5_000)
    return { days: 1, rationale: 'Based on the price, since no income is set yet.' };
  if (price < 15_000)
    return { days: 3, rationale: 'Based on the price, since no income is set yet.' };
  if (price < 50_000)
    return { days: 7, rationale: 'Based on the price, since no income is set yet.' };
  if (price < 150_000)
    return { days: 14, rationale: 'Based on the price, since no income is set yet.' };
  return { days: 30, rationale: 'Based on the price, since no income is set yet.' };
}

export type CooldownRevision = {
  /** The period that now applies, in days. */
  cooldownDays: number;
  /**
   * Recomputed from the original start date, never from now — the reflection the
   * user has already done is not taken away from them.
   */
  cooldownEndsAt: IsoTimestamp;
  /** True when the recomputed period has already elapsed. */
  isComplete: boolean;
};

export type CooldownRevisionInput = {
  /** The period as stored, and when it began. */
  cooldownDays: number;
  cooldownStartedAt: IsoTimestamp;
  /** The price the stored period was derived from, and the one replacing it. */
  previousPriceCents: Cents;
  newPriceCents: Cents;
  finances: MonthlyFinances | null;
};

/**
 * The reflection period after the price of an item changed.
 *
 * The period is derived from the price, so leaving it untouched after a large
 * change would let it describe a decision that is no longer the one being made:
 * an item edited from €50 to €2,000 would keep the single day a €50 item is
 * given and report itself ready to decide. That is not a loophole to police —
 * it is the app stating something untrue about a reflection that never happened.
 *
 * Two things this deliberately does not do. It never restarts from today: only
 * the end moves, so time already spent still counts. And it never overrides a
 * period the user chose themselves, detected by the stored period differing from
 * what was suggested for the old price.
 *
 * Returns `null` whenever the period should stay exactly as it is.
 */
export function reviseCooldownForPrice(
  input: CooldownRevisionInput,
  now: Date = new Date(),
): CooldownRevision | null {
  if (!Number.isFinite(input.previousPriceCents) || !Number.isFinite(input.newPriceCents)) {
    return null;
  }
  if (Math.round(input.newPriceCents) === Math.round(input.previousPriceCents)) return null;

  // Corrupt dates already read as a finished period; deriving a new end from
  // them would put the item back into a reflection it never had.
  const startedAt = parseIso(input.cooldownStartedAt);
  if (!startedAt) return null;

  const storedDays = Math.round(input.cooldownDays);
  if (storedDays !== suggestCooldownDays(input.previousPriceCents, input.finances).days) {
    return null;
  }

  const nextDays = suggestCooldownDays(input.newPriceCents, input.finances).days;
  if (nextDays === storedDays) return null;

  const { endsAt } = calculateCooldownEnd(nextDays, startedAt);
  return {
    cooldownDays: nextDays,
    cooldownEndsAt: endsAt,
    isComplete: Date.parse(endsAt) <= now.getTime(),
  };
}

/** `6 days remaining` / `4 hours remaining` / `Reflection period complete`. */
export function formatCooldownRemaining(state: CooldownState): string {
  if (state.isComplete) return 'Reflection period complete';
  if (state.daysRemaining <= 1) {
    return state.hoursRemaining <= 1
      ? 'Less than an hour remaining'
      : `${state.hoursRemaining} hours remaining`;
  }
  return `${state.daysRemaining} days remaining`;
}

/** Compact form for list rows: `6 days left`. */
export function formatCooldownRemainingShort(state: CooldownState): string {
  if (state.isComplete) return 'Ready to decide';
  if (state.daysRemaining <= 1) return `${Math.max(state.hoursRemaining, 1)}h left`;
  return `${state.daysRemaining} days left`;
}

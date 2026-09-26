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

/**
 * Why a period was suggested. A value, not a sentence: the domain decides which
 * of these applies, the UI decides how to say it and in which language.
 */
export type CooldownRationale =
  /** Under a twentieth of the money available this month. */
  | 'small_share'
  /** Under a fifth of it. */
  | 'under_a_fifth'
  /** Under three fifths of it. */
  | 'noticeable_share'
  /** Around one month of it. */
  | 'about_a_month'
  /** More than one month of it. */
  | 'over_a_month'
  /** No income is set, so the period comes from the price alone. */
  | 'price_only'
  /** No price has been entered yet, so the default period stands until one is. */
  | 'no_price';

export type CooldownSuggestion = {
  days: number;
  rationale: CooldownRationale;
};

/**
 * The suggested period by how much of a month's available money the price is.
 *
 * Read as bands: the first row whose `below` the ratio falls under wins, and
 * the last row is what is left. Written as a table rather than a chain of `if`s
 * because these five numbers are the whole of the app's opinion about how long
 * to think — the one place it says anything resembling a judgement — and a
 * table can be read, reviewed and changed without reading code around it.
 *
 * The ladder itself: a twentieth of the month is a day, a fifth is three, past
 * half of it a week, around a whole month a fortnight, and more than that a
 * month. Every step is a suggestion the user can override with one tap.
 */
const SUGGESTION_BY_AVAILABLE_RATIO: readonly {
  below: number;
  days: number;
  rationale: CooldownRationale;
}[] = [
  { below: 0.05, days: 1, rationale: 'small_share' },
  { below: 0.2, days: 3, rationale: 'under_a_fifth' },
  { below: 0.6, days: 7, rationale: 'noticeable_share' },
  { below: 1.5, days: 14, rationale: 'about_a_month' },
  { below: Number.POSITIVE_INFINITY, days: 30, rationale: 'over_a_month' },
];

/**
 * The fallback when the price cannot be compared to anything: no income set, or
 * commitments consuming all of it.
 *
 * Absolute amounts mean less than a share of a month — they are the same bands
 * for every income — but a suggestion of "one day" for a €2,000 purchase would
 * be worse than a rough one. The rationale says so: every row reports
 * `price_only`, and the UI turns that into a sentence naming the price as the
 * only thing it went on.
 */
const SUGGESTION_BY_PRICE: readonly { belowCents: Cents; days: number }[] = [
  { belowCents: 5_000, days: 1 },
  { belowCents: 15_000, days: 3 },
  { belowCents: 50_000, days: 7 },
  { belowCents: 150_000, days: 14 },
  { belowCents: Number.POSITIVE_INFINITY, days: 30 },
];

/**
 * Suggests a reflection period from the price.
 *
 * This is a suggestion, not advice, and the user can always override it. It is
 * deterministic and fully described by the two tables above: larger relative
 * cost → longer default period.
 */
export function suggestCooldownDays(
  priceCents: Cents | null,
  finances: MonthlyFinances | null,
): CooldownSuggestion {
  // Without a price there is nothing to size the period by. Treating it as zero
  // suggested the shortest period and called the price "small", before the
  // user had typed one.
  if (priceCents == null) return { days: DEFAULT_COOLDOWN_DAYS, rationale: 'no_price' };

  const price = Number.isFinite(priceCents) ? Math.max(priceCents, 0) : 0;

  const available = finances?.availableAfterCommitmentsCents ?? 0;
  if (finances?.isIncomeConfigured && available > 0) {
    const ratio = price / available;
    const band = SUGGESTION_BY_AVAILABLE_RATIO.find((entry) => ratio < entry.below);
    // The last band is unbounded, so this only falls through for a non-finite
    // ratio — which `price` and `available` above have already ruled out.
    return band
      ? { days: band.days, rationale: band.rationale }
      : { days: 30, rationale: 'over_a_month' };
  }

  const band = SUGGESTION_BY_PRICE.find((entry) => price < entry.belowCents);
  return { days: band?.days ?? 30, rationale: 'price_only' };
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

/**
 * How much of a reflection period is left, as the four cases the UI has to say
 * differently — complete, under an hour, a number of hours, a number of days.
 *
 * A discriminated union rather than a sentence: rendering it is the UI's job,
 * and "6 days remaining" needs a plural rule the domain has no business owning.
 */
export type CooldownRemaining =
  | { kind: 'complete' }
  | { kind: 'under_an_hour' }
  | { kind: 'hours'; hours: number }
  | { kind: 'days'; days: number };

export function cooldownRemaining(state: CooldownState): CooldownRemaining {
  if (state.isComplete) return { kind: 'complete' };
  if (state.daysRemaining <= 1) {
    return state.hoursRemaining <= 1
      ? { kind: 'under_an_hour' }
      : { kind: 'hours', hours: state.hoursRemaining };
  }
  return { kind: 'days', days: state.daysRemaining };
}

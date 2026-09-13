import type {
  CommitmentFrequency,
  ExpenseType,
  ThemeMode,
  UsageFrequencyId,
  WishlistStatus,
} from '@/types/domain';

/**
 * The runtime tuples behind the id unions in `src/types/domain`.
 *
 * A union exists only at compile time, and three parts of the app need the same
 * ids at runtime for different reasons: `z.enum` needs literals to validate what
 * a user typed, `src/db/mappers` needs a set to check a stored row against, and
 * a picker needs something to map over. Each had written its own copy, so the
 * app carried four lists of commitment frequencies and two of expense types —
 * and a seventh frequency would have had to be remembered in every one of them.
 *
 * `satisfies` is what makes this a single source rather than a fourth copy: a
 * tuple that drifts from its union stops compiling here, and `as const` keeps
 * the literal types `z.enum` needs.
 *
 * Order matters where a picker renders it: these are the order the options are
 * offered in.
 */

export const THEME_MODES = ['system', 'light', 'dark'] as const satisfies readonly ThemeMode[];

export const COMMITMENT_FREQUENCY_IDS = [
  'monthly',
  'every_two_months',
  'quarterly',
  'semiannual',
  'annual',
] as const satisfies readonly CommitmentFrequency[];

export const WISHLIST_STATUSES = [
  'thinking',
  'ready_to_decide',
  'purchased',
  'dismissed',
] as const satisfies readonly WishlistStatus[];

export const EXPENSE_TYPES = [
  'accessory',
  'maintenance',
  'repair',
  'upgrade',
  'other',
] as const satisfies readonly ExpenseType[];

export const USAGE_FREQUENCY_IDS = [
  'daily',
  'several_times_week',
  'weekly',
  'several_times_month',
  'monthly',
  'occasionally',
  'custom',
] as const satisfies readonly UsageFrequencyId[];

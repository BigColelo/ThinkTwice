/**
 * ThinkTwice domain entities.
 *
 * Conventions enforced across the whole codebase:
 * - Money is ALWAYS an integer number of minor units (cents). Fields are suffixed
 *   `Cents` so a euro value can never be assigned by accident.
 * - Timestamps are ALWAYS ISO-8601 UTC strings (`2026-08-13T09:12:44.000Z`).
 *   Calendar-only values (a purchase date) use `YYYY-MM-DD`.
 * - Nothing derivable is persisted. Cost per use, impact ratios and remaining
 *   cooldown days are computed from stored facts, never stored.
 */

/** An integer amount in the currency's minor unit (e.g. euro cents). */
export type Cents = number;

/** ISO-8601 timestamp in UTC, e.g. `2026-08-13T09:12:44.000Z`. */
export type IsoTimestamp = string;

/** Calendar date without a time component, e.g. `2026-08-13`. */
export type IsoDate = string;

export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * V1 ships EUR only, but every formatting path already goes through the
 * currency code so adding another is a data change, not a refactor.
 */
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF';

export type CommitmentFrequency =
  'monthly' | 'every_two_months' | 'quarterly' | 'semiannual' | 'annual';

export type WishlistStatus = 'thinking' | 'ready_to_decide' | 'purchased' | 'dismissed';

export type ExpenseType = 'accessory' | 'maintenance' | 'repair' | 'upgrade' | 'other';

/** Identifier of an entry in `constants/usagePresets`. */
export type UsageFrequencyId =
  | 'daily'
  | 'several_times_week'
  | 'weekly'
  | 'several_times_month'
  | 'monthly'
  | 'occasionally'
  | 'custom';

/** Identifier of an entry in `constants/categories`. */
export type CategoryId = string;

// -- Entities ----------------------------------------------------------------

export type AppSettings = {
  currencyCode: CurrencyCode;
  themeMode: ThemeMode;
  monthlyNetIncomeCents: Cents;
  /** `null` when the user has not set a savings target. Kept separate from commitments. */
  monthlySavingsTargetCents: Cents | null;
  onboardingCompleted: boolean;
  /** Whether the user opted into local cooldown reminders. Permission is requested contextually. */
  cooldownRemindersEnabled: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};

export type RecurringCommitment = {
  id: string;
  name: string;
  amountCents: Cents;
  frequency: CommitmentFrequency;
  categoryId: CategoryId;
  isActive: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};

export type WishlistItem = {
  id: string;
  name: string;
  priceCents: Cents;
  categoryId: CategoryId;
  imageUri: string | null;

  expectedUsageFrequency: UsageFrequencyId;
  /** Only meaningful when `expectedUsageFrequency === 'custom'`: uses per month. */
  customUsesPerMonth: number | null;
  expectedOwnershipMonths: number;

  cooldownDays: number;
  cooldownStartedAt: IsoTimestamp;
  cooldownEndsAt: IsoTimestamp;

  status: WishlistStatus;

  reasonTags: string[];
  notes: string | null;

  /** Set when the item was converted into a purchase, so history is preserved. */
  decidedAt: IsoTimestamp | null;

  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};

export type Purchase = {
  id: string;
  /** Present when the purchase came from a wishlist item. */
  wishlistItemId: string | null;
  name: string;
  purchasePriceCents: Cents;
  purchaseDate: IsoDate;
  categoryId: CategoryId;
  imageUri: string | null;

  /** Carried over from the wishlist item when one existed, so estimate vs reality stays comparable. */
  expectedUsageFrequency: UsageFrequencyId | null;
  customUsesPerMonth: number | null;
  expectedOwnershipMonths: number | null;

  /** User-maintained estimate of what the item is worth today. */
  currentResaleValueCents: Cents | null;

  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};

export type UsageEvent = {
  id: string;
  purchaseId: string;
  occurredAt: IsoTimestamp;
  /** Almost always 1; the column exists so bulk entry can be added without a migration. */
  count: number;
  createdAt: IsoTimestamp;
};

export type PurchaseExpense = {
  id: string;
  purchaseId: string;
  name: string;
  amountCents: Cents;
  expenseType: ExpenseType;
  date: IsoDate;
  createdAt: IsoTimestamp;
};

// -- Read models -------------------------------------------------------------

/**
 * A purchase joined with the aggregates every list and detail screen needs.
 * Produced by the repository in SQL so screens never fan out N+1 queries.
 */
export type PurchaseWithStats = Purchase & {
  totalUses: number;
  additionalExpensesCents: Cents;
  lastUsedAt: IsoTimestamp | null;
};

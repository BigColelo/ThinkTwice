import { LANGUAGE_PREFERENCES } from '@/i18n/languages';
import type {
  AppSettings,
  CommitmentFrequency,
  ExpenseType,
  Purchase,
  PurchaseExpense,
  PurchaseWithStats,
  RecurringCommitment,
  ThemeMode,
  UsageEvent,
  UsageFrequencyId,
  WishlistItem,
  WishlistStatus,
} from '@/types/domain';
import { SUPPORTED_CURRENCIES } from '@/utils/currency';

/**
 * SQLite rows ↔ domain entities.
 *
 * Everything crossing this boundary is treated as untrusted: a row could have
 * been written by an older build, or hand-edited. Enum-like columns are
 * validated against the known set and fall back to a safe default instead of
 * letting an unexpected string flow into a `switch`.
 */

// -- Row shapes --------------------------------------------------------------

export type AppSettingsRow = {
  currency_code: string;
  theme_mode: string;
  language: string;
  monthly_net_income_cents: number;
  monthly_savings_target_cents: number | null;
  onboarding_completed: number;
  cooldown_reminders_enabled: number;
  created_at: string;
  updated_at: string;
};

export type RecurringCommitmentRow = {
  id: string;
  name: string;
  amount_cents: number;
  frequency: string;
  category_id: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type WishlistItemRow = {
  id: string;
  name: string;
  price_cents: number;
  category_id: string;
  image_uri: string | null;
  expected_usage_frequency: string;
  custom_uses_per_month: number | null;
  expected_ownership_months: number;
  cooldown_days: number;
  cooldown_started_at: string;
  cooldown_ends_at: string;
  status: string;
  notes: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseRow = {
  id: string;
  wishlist_item_id: string | null;
  name: string;
  purchase_price_cents: number;
  purchase_date: string;
  category_id: string;
  image_uri: string | null;
  expected_usage_frequency: string | null;
  custom_uses_per_month: number | null;
  expected_ownership_months: number | null;
  current_resale_value_cents: number | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseWithStatsRow = PurchaseRow & {
  total_uses: number;
  additional_expenses_cents: number;
  last_used_at: string | null;
};

export type UsageEventRow = {
  id: string;
  purchase_id: string;
  occurred_at: string;
  count: number;
  created_at: string;
};

export type PurchaseExpenseRow = {
  id: string;
  purchase_id: string;
  name: string;
  amount_cents: number;
  expense_type: string;
  date: string;
  created_at: string;
};

// -- Validation helpers ------------------------------------------------------

const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];
const FREQUENCIES: readonly CommitmentFrequency[] = [
  'monthly',
  'every_two_months',
  'quarterly',
  'semiannual',
  'annual',
];
const STATUSES: readonly WishlistStatus[] = [
  'thinking',
  'ready_to_decide',
  'purchased',
  'dismissed',
];
const EXPENSE_TYPES: readonly ExpenseType[] = [
  'accessory',
  'maintenance',
  'repair',
  'upgrade',
  'other',
];
const USAGE_IDS: readonly UsageFrequencyId[] = [
  'daily',
  'several_times_week',
  'weekly',
  'several_times_month',
  'monthly',
  'occasionally',
  'custom',
];

function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function toBoolean(value: number | null | undefined): boolean {
  return value === 1;
}

export function fromBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function toInteger(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
}

function toNullableInteger(value: number | null | undefined): number | null {
  if (value == null) return null;
  return Number.isFinite(value) ? Math.round(value) : null;
}

function toNullableNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  return Number.isFinite(value) ? value : null;
}

// -- Mappers -----------------------------------------------------------------

export function mapAppSettings(row: AppSettingsRow): AppSettings {
  return {
    // Validated against what the app currently offers, not against every code
    // the type allows: a currency stored by another build would otherwise leave
    // the user looking at a symbol they have no way to change back.
    currencyCode: oneOf(SUPPORTED_CURRENCIES, row.currency_code, 'EUR'),
    themeMode: oneOf(THEME_MODES, row.theme_mode, 'system'),
    // A language this build no longer ships falls back to the device's, which is
    // a language the user can read, rather than to English.
    language: oneOf(LANGUAGE_PREFERENCES, row.language, 'system'),
    monthlyNetIncomeCents: toInteger(row.monthly_net_income_cents),
    monthlySavingsTargetCents: toNullableInteger(row.monthly_savings_target_cents),
    onboardingCompleted: toBoolean(row.onboarding_completed),
    cooldownRemindersEnabled: toBoolean(row.cooldown_reminders_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRecurringCommitment(row: RecurringCommitmentRow): RecurringCommitment {
  return {
    id: row.id,
    name: row.name,
    amountCents: toInteger(row.amount_cents),
    frequency: oneOf(FREQUENCIES, row.frequency, 'monthly'),
    categoryId: row.category_id,
    isActive: toBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapWishlistItem(row: WishlistItemRow): WishlistItem {
  return {
    id: row.id,
    name: row.name,
    priceCents: toInteger(row.price_cents),
    categoryId: row.category_id,
    imageUri: row.image_uri,
    expectedUsageFrequency: oneOf(USAGE_IDS, row.expected_usage_frequency, 'weekly'),
    customUsesPerMonth: toNullableNumber(row.custom_uses_per_month),
    expectedOwnershipMonths: toInteger(row.expected_ownership_months, 12),
    cooldownDays: toInteger(row.cooldown_days, 7),
    cooldownStartedAt: row.cooldown_started_at,
    cooldownEndsAt: row.cooldown_ends_at,
    status: oneOf(STATUSES, row.status, 'thinking'),
    notes: row.notes,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPurchase(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    wishlistItemId: row.wishlist_item_id,
    name: row.name,
    purchasePriceCents: toInteger(row.purchase_price_cents),
    purchaseDate: row.purchase_date,
    categoryId: row.category_id,
    imageUri: row.image_uri,
    expectedUsageFrequency: row.expected_usage_frequency
      ? oneOf(USAGE_IDS, row.expected_usage_frequency, 'weekly')
      : null,
    customUsesPerMonth: toNullableNumber(row.custom_uses_per_month),
    expectedOwnershipMonths: toNullableInteger(row.expected_ownership_months),
    currentResaleValueCents: toNullableInteger(row.current_resale_value_cents),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPurchaseWithStats(row: PurchaseWithStatsRow): PurchaseWithStats {
  return {
    ...mapPurchase(row),
    totalUses: toInteger(row.total_uses),
    additionalExpensesCents: toInteger(row.additional_expenses_cents),
    lastUsedAt: row.last_used_at,
  };
}

export function mapUsageEvent(row: UsageEventRow): UsageEvent {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    occurredAt: row.occurred_at,
    count: toInteger(row.count, 1),
    createdAt: row.created_at,
  };
}

export function mapPurchaseExpense(row: PurchaseExpenseRow): PurchaseExpense {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    name: row.name,
    amountCents: toInteger(row.amount_cents),
    expenseType: oneOf(EXPENSE_TYPES, row.expense_type, 'other'),
    date: row.date,
    createdAt: row.created_at,
  };
}

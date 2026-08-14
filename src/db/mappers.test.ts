import { USAGE_PRESETS } from '@/constants/usagePresets';

import {
  mapAppSettings,
  mapPurchase,
  mapPurchaseExpense,
  mapPurchaseWithStats,
  mapRecurringCommitment,
  mapUsageEvent,
  mapWishlistItem,
  parseReasonTags,
  serializeReasonTags,
  type AppSettingsRow,
  type PurchaseExpenseRow,
  type PurchaseWithStatsRow,
  type RecurringCommitmentRow,
  type UsageEventRow,
  type WishlistItemRow,
} from './mappers';

/**
 * The mapper is the only thing standing between a stored row and the app, so
 * the cases worth testing are the ones where the row is *not* what this build
 * would have written: an older schema, another build's enum value, a
 * hand-edited file, a non-finite number.
 *
 * A failure here does not crash — it shows the user a confident wrong figure —
 * which is why the defaults are asserted rather than assumed.
 */

const CREATED_AT = '2026-08-13T09:00:00.000Z';

function settingsRow(overrides: Partial<AppSettingsRow> = {}): AppSettingsRow {
  return {
    currency_code: 'EUR',
    theme_mode: 'system',
    monthly_net_income_cents: 165_000,
    monthly_savings_target_cents: null,
    onboarding_completed: 1,
    cooldown_reminders_enabled: 0,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

function commitmentRow(overrides: Partial<RecurringCommitmentRow> = {}): RecurringCommitmentRow {
  return {
    id: 'c1',
    name: 'Rent',
    amount_cents: 78_300,
    frequency: 'monthly',
    category_id: 'housing',
    is_active: 1,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

function wishlistRow(overrides: Partial<WishlistItemRow> = {}): WishlistItemRow {
  return {
    id: 'w1',
    name: 'Camera',
    price_cents: 179_900,
    category_id: 'photography',
    image_uri: null,
    expected_usage_frequency: 'several_times_week',
    custom_uses_per_month: null,
    expected_ownership_months: 60,
    cooldown_days: 7,
    cooldown_started_at: '2026-08-06T09:00:00.000Z',
    cooldown_ends_at: CREATED_AT,
    status: 'thinking',
    reason_tags: '["Hobby"]',
    notes: null,
    decided_at: null,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

function purchaseRow(overrides: Partial<PurchaseWithStatsRow> = {}): PurchaseWithStatsRow {
  return {
    id: 'p1',
    wishlist_item_id: null,
    name: 'Espresso machine',
    purchase_price_cents: 65_000,
    purchase_date: '2026-08-13',
    category_id: 'home',
    image_uri: null,
    expected_usage_frequency: null,
    custom_uses_per_month: null,
    expected_ownership_months: null,
    current_resale_value_cents: null,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    total_uses: 0,
    additional_expenses_cents: 0,
    last_used_at: null,
    ...overrides,
  };
}

function usageRow(overrides: Partial<UsageEventRow> = {}): UsageEventRow {
  return {
    id: 'u1',
    purchase_id: 'p1',
    occurred_at: CREATED_AT,
    count: 1,
    created_at: CREATED_AT,
    ...overrides,
  };
}

function expenseRow(overrides: Partial<PurchaseExpenseRow> = {}): PurchaseExpenseRow {
  return {
    id: 'e1',
    purchase_id: 'p1',
    name: 'Descaler',
    amount_cents: 1_200,
    expense_type: 'maintenance',
    date: '2026-08-13',
    created_at: CREATED_AT,
    ...overrides,
  };
}

describe('mapAppSettings', () => {
  it('reads a row written by this build', () => {
    const settings = mapAppSettings(settingsRow());

    expect(settings.currencyCode).toBe('EUR');
    expect(settings.themeMode).toBe('system');
    expect(settings.monthlyNetIncomeCents).toBe(165_000);
    expect(settings.monthlySavingsTargetCents).toBeNull();
    expect(settings.onboardingCompleted).toBe(true);
  });

  it('falls back to EUR for a currency the app does not offer', () => {
    // A code stored by another build would otherwise leave the user looking at
    // a symbol with no control to change it back.
    expect(mapAppSettings(settingsRow({ currency_code: 'USD' })).currencyCode).toBe('EUR');
    expect(mapAppSettings(settingsRow({ currency_code: 'nonsense' })).currencyCode).toBe('EUR');
  });

  it('never lets a non-finite amount out of the database', () => {
    const settings = mapAppSettings(
      settingsRow({
        monthly_net_income_cents: Number.NaN,
        monthly_savings_target_cents: Number.POSITIVE_INFINITY,
      }),
    );

    expect(settings.monthlyNetIncomeCents).toBe(0);
    expect(settings.monthlySavingsTargetCents).toBeNull();
  });
});

describe('mapRecurringCommitment', () => {
  it('reads a row written by this build', () => {
    const commitment = mapRecurringCommitment(commitmentRow());

    expect(commitment.amountCents).toBe(78_300);
    expect(commitment.frequency).toBe('monthly');
    expect(commitment.isActive).toBe(true);
  });

  it('falls back to monthly for a frequency it does not know', () => {
    // Every monthly total divides by a known number of occurrences; an unknown
    // frequency would otherwise reach that switch and produce nothing.
    expect(mapRecurringCommitment(commitmentRow({ frequency: 'weekly' })).frequency).toBe(
      'monthly',
    );
  });

  it('treats only 1 as active, so a paused commitment stays paused', () => {
    expect(mapRecurringCommitment(commitmentRow({ is_active: 0 })).isActive).toBe(false);
  });

  it('rounds a fractional amount to whole cents', () => {
    expect(mapRecurringCommitment(commitmentRow({ amount_cents: 78_300.6 })).amountCents).toBe(
      78_301,
    );
  });

  it('never lets a non-finite amount out of the database', () => {
    expect(mapRecurringCommitment(commitmentRow({ amount_cents: Number.NaN })).amountCents).toBe(0);
  });
});

describe('mapWishlistItem', () => {
  it('reads a row written by this build', () => {
    const item = mapWishlistItem(wishlistRow());

    expect(item.priceCents).toBe(179_900);
    expect(item.expectedUsageFrequency).toBe('several_times_week');
    expect(item.expectedOwnershipMonths).toBe(60);
    expect(item.status).toBe('thinking');
    expect(item.reasonTags).toEqual(['Hobby']);
  });

  it('reads back every usage preset the app defines', () => {
    // The presets and this allow-list are separate lists. If a preset is added
    // to one and not the other, stored rows would silently read as weekly — and
    // the cost per use shown for them would be wrong, with no error anywhere.
    for (const preset of USAGE_PRESETS) {
      expect(
        mapWishlistItem(wishlistRow({ expected_usage_frequency: preset.id }))
          .expectedUsageFrequency,
      ).toBe(preset.id);
    }
  });

  it('falls back to weekly for a frequency it does not know', () => {
    expect(
      mapWishlistItem(wishlistRow({ expected_usage_frequency: 'hourly' })).expectedUsageFrequency,
    ).toBe('weekly');
  });

  it('falls back to thinking for a status it does not know', () => {
    expect(mapWishlistItem(wishlistRow({ status: 'archived' })).status).toBe('thinking');
  });

  it('keeps a fractional custom rate, which is a legitimate answer', () => {
    // 0.5 uses per month is "twice a year"; rounding it to zero would erase the estimate.
    expect(mapWishlistItem(wishlistRow({ custom_uses_per_month: 0.5 })).customUsesPerMonth).toBe(
      0.5,
    );
  });

  it('drops a non-finite custom rate rather than passing it on', () => {
    expect(
      mapWishlistItem(wishlistRow({ custom_uses_per_month: Number.POSITIVE_INFINITY }))
        .customUsesPerMonth,
    ).toBeNull();
  });

  it('falls back to a usable ownership and cooldown when the row has neither', () => {
    const item = mapWishlistItem(
      wishlistRow({ expected_ownership_months: Number.NaN, cooldown_days: Number.NaN }),
    );

    expect(item.expectedOwnershipMonths).toBe(12);
    expect(item.cooldownDays).toBe(7);
  });

  it('degrades malformed reason tags to none instead of throwing', () => {
    expect(mapWishlistItem(wishlistRow({ reason_tags: 'not json' })).reasonTags).toEqual([]);
    expect(mapWishlistItem(wishlistRow({ reason_tags: '{"a":1}' })).reasonTags).toEqual([]);
    expect(mapWishlistItem(wishlistRow({ reason_tags: '["Hobby",7,null]' })).reasonTags).toEqual([
      'Hobby',
    ]);
  });
});

describe('mapPurchase', () => {
  it('leaves the expectation empty for an item added as already owned', () => {
    // No wishlist item behind it means no estimate to compare against; that is
    // different from having estimated "weekly".
    expect(mapPurchase(purchaseRow()).expectedUsageFrequency).toBeNull();
  });

  it('falls back to weekly only when a frequency is present but unknown', () => {
    expect(
      mapPurchase(purchaseRow({ expected_usage_frequency: 'hourly' })).expectedUsageFrequency,
    ).toBe('weekly');
  });

  it('keeps a resale value of zero distinct from no estimate at all', () => {
    // Zero means "worth nothing now"; null means the user never said.
    expect(
      mapPurchase(purchaseRow({ current_resale_value_cents: 0 })).currentResaleValueCents,
    ).toBe(0);
    expect(
      mapPurchase(purchaseRow({ current_resale_value_cents: null })).currentResaleValueCents,
    ).toBeNull();
  });

  it('drops a non-finite resale value', () => {
    expect(
      mapPurchase(purchaseRow({ current_resale_value_cents: Number.NaN })).currentResaleValueCents,
    ).toBeNull();
  });

  it('rounds a fractional price to whole cents', () => {
    expect(mapPurchase(purchaseRow({ purchase_price_cents: 64_999.5 })).purchasePriceCents).toBe(
      65_000,
    );
  });
});

describe('mapPurchaseWithStats', () => {
  it('carries the SQL aggregates alongside the purchase', () => {
    const purchase = mapPurchaseWithStats(
      purchaseRow({ total_uses: 42, additional_expenses_cents: 3_500, last_used_at: CREATED_AT }),
    );

    expect(purchase.name).toBe('Espresso machine');
    expect(purchase.totalUses).toBe(42);
    expect(purchase.additionalExpensesCents).toBe(3_500);
    expect(purchase.lastUsedAt).toBe(CREATED_AT);
  });

  it('treats missing aggregates as none, never as non-finite', () => {
    const purchase = mapPurchaseWithStats(
      purchaseRow({ total_uses: Number.NaN, additional_expenses_cents: Number.NaN }),
    );

    // Cost per use divides by these; a NaN here would surface as a NaN on screen.
    expect(purchase.totalUses).toBe(0);
    expect(purchase.additionalExpensesCents).toBe(0);
    expect(purchase.lastUsedAt).toBeNull();
  });
});

describe('mapUsageEvent', () => {
  it('reads a row written by this build', () => {
    expect(mapUsageEvent(usageRow()).count).toBe(1);
  });

  it('counts a non-finite count as a single use', () => {
    expect(mapUsageEvent(usageRow({ count: Number.NaN })).count).toBe(1);
  });

  it('rounds a fractional count', () => {
    expect(mapUsageEvent(usageRow({ count: 2.6 })).count).toBe(3);
  });
});

describe('mapPurchaseExpense', () => {
  it('reads a row written by this build', () => {
    const expense = mapPurchaseExpense(expenseRow());

    expect(expense.amountCents).toBe(1_200);
    expect(expense.expenseType).toBe('maintenance');
  });

  it('falls back to other for an expense type it does not know', () => {
    expect(mapPurchaseExpense(expenseRow({ expense_type: 'insurance' })).expenseType).toBe('other');
  });

  it('never lets a non-finite amount into the real-cost total', () => {
    expect(mapPurchaseExpense(expenseRow({ amount_cents: Number.NaN })).amountCents).toBe(0);
  });
});

describe('reason tags', () => {
  it('round-trip through storage unchanged', () => {
    const tags = ['Hobby', 'Work'];

    expect(parseReasonTags(serializeReasonTags(tags))).toEqual(tags);
  });

  it('reads an empty or absent value as no tags', () => {
    expect(parseReasonTags(serializeReasonTags([]))).toEqual([]);
    expect(parseReasonTags(null)).toEqual([]);
    expect(parseReasonTags('')).toEqual([]);
  });
});

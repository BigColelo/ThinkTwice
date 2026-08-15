import { OWNERSHIP_PRESETS } from '@/constants/ownership';
import { USAGE_PRESETS } from '@/constants/usagePresets';
import { COOLDOWN_DAY_OPTIONS, MAX_COOLDOWN_DAYS, MIN_COOLDOWN_DAYS } from '@/domain';
import { t } from '@/i18n';

import { buildWishlistItemSchema } from './wishlistItemSchema';

// The suite pins the language to English, so one schema serves every case.
const wishlistItemSchema = buildWishlistItemSchema(t);

/**
 * Validation for the "something I want to buy" form.
 *
 * TypeScript cannot check what a user types, so this schema is the only thing
 * standing between a form and the database. The cases that matter most are the
 * ones that fail quietly when the rule is missing: a price of zero, a custom
 * frequency without a rate, and the optional fields that must stay optional.
 */

function values(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Camera',
    priceCents: 179_900,
    categoryId: 'photography',
    imageUri: null,
    expectedUsageFrequency: 'several_times_week',
    customUsesPerMonth: null,
    expectedOwnershipMonths: 60,
    cooldownDays: 7,
    notes: null,
    ...overrides,
  };
}

/** The first message per field path, which is what the form renders. */
function errorsOf(input: Record<string, unknown>): Record<string, string> {
  const result = wishlistItemSchema.safeParse(input);
  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    errors[key] ??= issue.message;
  }
  return errors;
}

describe('name', () => {
  it('is required', () => {
    expect(errorsOf(values({ name: '' })).name).toBe('Give this item a name.');
  });

  it('treats whitespace as no name at all', () => {
    expect(errorsOf(values({ name: '   ' })).name).toBe('Give this item a name.');
  });

  it('is trimmed, so the stored name has no stray spaces', () => {
    const result = wishlistItemSchema.safeParse(values({ name: '  Camera  ' }));

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Camera');
  });

  it('has an upper bound', () => {
    expect(errorsOf(values({ name: 'x'.repeat(81) })).name).toBe(
      'Keep the name under 80 characters.',
    );
  });
});

describe('price', () => {
  it('refuses zero, even typed deliberately', () => {
    // Zero would otherwise reach the impact calculation as a real figure and
    // describe an item with no price as low impact, 0% of income.
    expect(errorsOf(values({ priceCents: 0 })).priceCents).toBe('Enter a price greater than zero.');
  });

  it('refuses an empty field, and says it is missing rather than too small', () => {
    // `null` is what the form holds until a price is typed — the field starts
    // empty rather than at a zero nobody entered.
    expect(errorsOf(values({ priceCents: null })).priceCents).toBe('Enter a price.');
  });

  it('refuses a negative price', () => {
    expect(errorsOf(values({ priceCents: -500 })).priceCents).toBe(
      'Enter a price greater than zero.',
    );
  });

  it('refuses a missing price', () => {
    expect(errorsOf(values({ priceCents: undefined })).priceCents).toBe('Enter a price.');
  });

  it('refuses fractional cents, because money is integer minor units', () => {
    expect(errorsOf(values({ priceCents: 1_799.5 })).priceCents).toBeDefined();
  });

  it('accepts one cent, the smallest real price', () => {
    expect(wishlistItemSchema.safeParse(values({ priceCents: 1 })).success).toBe(true);
  });

  it('catches a slipped keystroke above the maximum', () => {
    expect(errorsOf(values({ priceCents: 100_000_001 })).priceCents).toBe(
      'That price looks too large.',
    );
  });
});

describe('expected usage', () => {
  it('accepts every preset the form offers', () => {
    for (const preset of USAGE_PRESETS) {
      const input = values({
        expectedUsageFrequency: preset.id,
        // Only the custom preset carries a rate.
        customUsesPerMonth: preset.id === 'custom' ? 12 : null,
      });
      expect(wishlistItemSchema.safeParse(input).success).toBe(true);
    }
  });

  it('rejects a frequency it does not know', () => {
    expect(
      errorsOf(values({ expectedUsageFrequency: 'hourly' })).expectedUsageFrequency,
    ).toBeDefined();
  });

  it('requires a rate when the frequency is custom, and says so on that field', () => {
    // Without this the estimate would simply not appear, with nothing explaining why.
    const errors = errorsOf(values({ expectedUsageFrequency: 'custom', customUsesPerMonth: null }));

    expect(errors.customUsesPerMonth).toBe('Enter how many times per month you expect to use it.');
  });

  it('rejects a rate of zero or below', () => {
    expect(
      errorsOf(values({ expectedUsageFrequency: 'custom', customUsesPerMonth: 0 }))
        .customUsesPerMonth,
    ).toBe('Enter how many times per month you expect to use it.');
  });

  it('rejects an implausible rate', () => {
    expect(
      errorsOf(values({ expectedUsageFrequency: 'custom', customUsesPerMonth: 1_001 }))
        .customUsesPerMonth,
    ).toBe('That looks like too many uses per month.');
  });

  it('accepts a fractional rate, since twice a quarter is a real answer', () => {
    const input = values({ expectedUsageFrequency: 'custom', customUsesPerMonth: 0.5 });

    expect(wishlistItemSchema.safeParse(input).success).toBe(true);
  });
});

describe('expected ownership', () => {
  it('must be at least one month', () => {
    expect(errorsOf(values({ expectedOwnershipMonths: 0 })).expectedOwnershipMonths).toBe(
      'Expected ownership must be at least one month.',
    );
  });

  it('rejects a negative duration', () => {
    expect(errorsOf(values({ expectedOwnershipMonths: -12 })).expectedOwnershipMonths).toBe(
      'Expected ownership must be at least one month.',
    );
  });

  it('is whole months', () => {
    expect(
      errorsOf(values({ expectedOwnershipMonths: 18.5 })).expectedOwnershipMonths,
    ).toBeDefined();
  });

  it('has an upper bound', () => {
    expect(errorsOf(values({ expectedOwnershipMonths: 601 })).expectedOwnershipMonths).toBe(
      'That is longer than this app plans for.',
    );
  });

  it('accepts every preset the form offers', () => {
    for (const months of OWNERSHIP_PRESETS) {
      expect(
        wishlistItemSchema.safeParse(values({ expectedOwnershipMonths: months })).success,
      ).toBe(true);
    }
  });
});

describe('cooldown', () => {
  it('accepts every period the form offers', () => {
    // The form derives a suggested period from the price; if that set and this
    // schema ever drift apart, the suggestion would be saved unvalidated.
    for (const days of COOLDOWN_DAY_OPTIONS) {
      expect(wishlistItemSchema.safeParse(values({ cooldownDays: days })).success).toBe(true);
    }
  });

  it('rejects no reflection period at all', () => {
    expect(errorsOf(values({ cooldownDays: 0 })).cooldownDays).toBe(
      `A reflection period is at least ${MIN_COOLDOWN_DAYS} day.`,
    );
  });

  it('rejects a period beyond the maximum', () => {
    expect(errorsOf(values({ cooldownDays: MAX_COOLDOWN_DAYS + 1 })).cooldownDays).toBe(
      `A reflection period is at most ${MAX_COOLDOWN_DAYS} days.`,
    );
  });

  it('accepts the boundaries themselves', () => {
    expect(wishlistItemSchema.safeParse(values({ cooldownDays: MIN_COOLDOWN_DAYS })).success).toBe(
      true,
    );
    expect(wishlistItemSchema.safeParse(values({ cooldownDays: MAX_COOLDOWN_DAYS })).success).toBe(
      true,
    );
  });
});

describe('optional fields', () => {
  it('accepts an item with no image and no notes', () => {
    const result = wishlistItemSchema.safeParse(values({ imageUri: null, notes: null }));

    expect(result.success).toBe(true);
  });

  it('keeps notes trimmed and bounded', () => {
    expect(wishlistItemSchema.safeParse(values({ notes: '  A note  ' })).data?.notes).toBe(
      'A note',
    );
    expect(errorsOf(values({ notes: 'x'.repeat(501) })).notes).toBe(
      'Keep notes under 500 characters.',
    );
  });

  it('still requires a category, which the form always has selected', () => {
    expect(errorsOf(values({ categoryId: '' })).categoryId).toBe('Choose a category.');
  });
});

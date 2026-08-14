import { OWNERSHIP_PRESETS } from '@/constants/ownership';
import { USAGE_PRESETS } from '@/constants/usagePresets';

import {
  confirmedPurchaseSchema,
  ownedPurchaseSchema,
  purchaseExpenseSchema,
} from './purchaseSchema';

/**
 * Validation for the two forms that record money already spent.
 *
 * The rule worth stating plainly: a price of zero is **valid** here, unlike on a
 * wishlist item. A gift or a hand-me-down is a real way to end up owning
 * something, its real cost is made of the expenses that follow, and €0.00 per use
 * is the true answer rather than a placeholder. The expectation is optional for
 * the same kind of reason — an item bought years ago may never have had one.
 */

function ownedValues(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Espresso machine',
    purchasePriceCents: 65_000,
    purchaseDate: '2026-08-13',
    categoryId: 'home',
    imageUri: null,
    currentResaleValueCents: null,
    expectedUsageFrequency: null,
    customUsesPerMonth: null,
    expectedOwnershipMonths: null,
    ...overrides,
  };
}

/** The first message per field path, which is what the form renders. */
function errorsOf(
  schema: { safeParse: (input: unknown) => { success: boolean; error?: { issues: unknown[] } } },
  input: Record<string, unknown>,
): Record<string, string> {
  const result = schema.safeParse(input);
  if (result.success || !result.error) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues as { path: unknown[]; message: string }[]) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    errors[key] ??= issue.message;
  }
  return errors;
}

describe('ownedPurchaseSchema, the item itself', () => {
  it('accepts a purchase with nothing optional filled in', () => {
    expect(ownedPurchaseSchema.safeParse(ownedValues()).success).toBe(true);
  });

  it('requires a name and trims it', () => {
    expect(errorsOf(ownedPurchaseSchema, ownedValues({ name: '  ' })).name).toBe(
      'Give this item a name.',
    );
    expect(ownedPurchaseSchema.safeParse(ownedValues({ name: '  Kettle ' })).data?.name).toBe(
      'Kettle',
    );
  });

  it('accepts a price of zero, because a gift is a real way to own something', () => {
    expect(ownedPurchaseSchema.safeParse(ownedValues({ purchasePriceCents: 0 })).success).toBe(
      true,
    );
  });

  it('still refuses a negative or fractional price', () => {
    expect(
      errorsOf(ownedPurchaseSchema, ownedValues({ purchasePriceCents: -1 })).purchasePriceCents,
    ).toBe('The price cannot be negative.');
    expect(
      errorsOf(ownedPurchaseSchema, ownedValues({ purchasePriceCents: 650.5 })).purchasePriceCents,
    ).toBeDefined();
  });

  it('insists on a real calendar date', () => {
    expect(
      errorsOf(ownedPurchaseSchema, ownedValues({ purchaseDate: '13/08/2026' })).purchaseDate,
    ).toBe('Choose a purchase date.');
    // Right shape, impossible day — the regex alone would let this through.
    expect(
      errorsOf(ownedPurchaseSchema, ownedValues({ purchaseDate: '2026-02-31' })).purchaseDate,
    ).toBe('Choose a valid purchase date.');
  });

  it('keeps a resale value of zero distinct from not having one', () => {
    // Zero means "worth nothing now"; null means the user never said.
    expect(
      ownedPurchaseSchema.safeParse(ownedValues({ currentResaleValueCents: 0 })).data
        ?.currentResaleValueCents,
    ).toBe(0);
    expect(
      ownedPurchaseSchema.safeParse(ownedValues({ currentResaleValueCents: null })).data
        ?.currentResaleValueCents,
    ).toBeNull();
    expect(
      errorsOf(ownedPurchaseSchema, ownedValues({ currentResaleValueCents: -100 }))
        .currentResaleValueCents,
    ).toBe('A resale value cannot be negative.');
  });
});

describe('ownedPurchaseSchema, the optional expectation', () => {
  it('accepts every frequency the form offers', () => {
    for (const preset of USAGE_PRESETS) {
      const input = ownedValues({
        expectedUsageFrequency: preset.id,
        customUsesPerMonth: preset.id === 'custom' ? 12 : null,
      });
      expect(ownedPurchaseSchema.safeParse(input).success).toBe(true);
    }
  });

  it('accepts every ownership duration the form offers', () => {
    for (const preset of OWNERSHIP_PRESETS) {
      expect(
        ownedPurchaseSchema.safeParse(ownedValues({ expectedOwnershipMonths: preset.months }))
          .success,
      ).toBe(true);
    }
  });

  it('rejects a frequency it does not know', () => {
    expect(
      errorsOf(ownedPurchaseSchema, ownedValues({ expectedUsageFrequency: 'hourly' }))
        .expectedUsageFrequency,
    ).toBeDefined();
  });

  it('requires a rate when the frequency is custom', () => {
    // Without it the comparison would simply not appear, with nothing explaining why.
    expect(
      errorsOf(
        ownedPurchaseSchema,
        ownedValues({ expectedUsageFrequency: 'custom', customUsesPerMonth: null }),
      ).customUsesPerMonth,
    ).toBe('Enter how many times per month you expect to use it.');
  });

  it('rejects an ownership duration under a month or beyond the maximum', () => {
    expect(
      errorsOf(ownedPurchaseSchema, ownedValues({ expectedOwnershipMonths: 0 }))
        .expectedOwnershipMonths,
    ).toBe('Expected ownership must be at least one month.');
    expect(
      errorsOf(ownedPurchaseSchema, ownedValues({ expectedOwnershipMonths: 601 }))
        .expectedOwnershipMonths,
    ).toBe('That is longer than this app plans for.');
  });
});

describe('confirmedPurchaseSchema', () => {
  it('asks for only the two things a wishlist item cannot know', () => {
    const result = confirmedPurchaseSchema.safeParse({
      purchaseDate: '2026-08-13',
      purchasePriceCents: 159_900,
    });

    expect(result.success).toBe(true);
  });

  it('validates them by exactly the same rules as the full form', () => {
    expect(
      errorsOf(confirmedPurchaseSchema, { purchaseDate: 'today', purchasePriceCents: 159_900 })
        .purchaseDate,
    ).toBe('Choose a purchase date.');
    expect(
      errorsOf(confirmedPurchaseSchema, { purchaseDate: '2026-08-13', purchasePriceCents: -1 })
        .purchasePriceCents,
    ).toBe('The price cannot be negative.');
  });
});

describe('purchaseExpenseSchema', () => {
  const expense = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'Descaler',
    amountCents: 1_200,
    expenseType: 'maintenance',
    date: '2026-08-13',
    ...overrides,
  });

  it('accepts an expense the form would produce', () => {
    expect(purchaseExpenseSchema.safeParse(expense()).success).toBe(true);
  });

  it('requires a name and a known type', () => {
    expect(errorsOf(purchaseExpenseSchema, expense({ name: '' })).name).toBe(
      'Give this expense a name.',
    );
    expect(
      errorsOf(purchaseExpenseSchema, expense({ expenseType: 'shipping' })).expenseType,
    ).toBeDefined();
  });

  it('refuses a negative amount, which would lower the real cost', () => {
    expect(errorsOf(purchaseExpenseSchema, expense({ amountCents: -500 })).amountCents).toBe(
      'The amount cannot be negative.',
    );
  });
});

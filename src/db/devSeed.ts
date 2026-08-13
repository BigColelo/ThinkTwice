import { calculateCooldownEnd } from '@/domain';
import { addDays, addMonths, toIsoDate, toIso } from '@/utils/dates';

import { invalidate } from './dataRevisions';
import type { Repositories } from './repositories';

/**
 * Development sample data.
 *
 * Guarded by `__DEV__` and only ever triggered by an explicit action in a
 * development build — production builds have no path that reaches it, so a real
 * user can never end up with invented financial records.
 */

export function isDevSeedAvailable(): boolean {
  return __DEV__;
}

export async function seedDevelopmentData(repositories: Repositories): Promise<void> {
  if (!__DEV__) {
    throw new Error('Sample data is only available in development builds.');
  }

  const now = new Date();

  await repositories.settings.update({
    monthlyNetIncomeCents: 165_000,
    monthlySavingsTargetCents: 30_000,
    onboardingCompleted: true,
  });

  const commitments = [
    { name: 'Rent', amountCents: 60_000, frequency: 'monthly', categoryId: 'housing' },
    { name: 'Utilities', amountCents: 12_000, frequency: 'monthly', categoryId: 'utilities' },
    { name: 'Netflix', amountCents: 1_799, frequency: 'monthly', categoryId: 'subscriptions' },
    { name: 'Phone plan', amountCents: 1_000, frequency: 'monthly', categoryId: 'phone' },
    { name: 'Gym', amountCents: 3_500, frequency: 'monthly', categoryId: 'health_fitness' },
    // A non-monthly commitment, so the monthly-equivalent path is exercised too.
    { name: 'Home insurance', amountCents: 24_000, frequency: 'annual', categoryId: 'insurance' },
  ] as const;

  for (const commitment of commitments) {
    await repositories.commitments.create({ ...commitment });
  }

  const cameraCooldown = calculateCooldownEnd(7, addDays(now, -1));
  await repositories.wishlist.create({
    name: 'Mirrorless camera',
    priceCents: 179_900,
    categoryId: 'photography',
    imageUri: null,
    expectedUsageFrequency: 'several_times_week',
    customUsesPerMonth: null,
    expectedOwnershipMonths: 60,
    cooldownDays: 7,
    cooldownStartedAt: cameraCooldown.startedAt,
    cooldownEndsAt: cameraCooldown.endsAt,
    reasonTags: ['Hobby', 'Long-term use'],
    notes: 'Would replace the phone camera for weekend trips.',
  });

  const headphonesCooldown = calculateCooldownEnd(14, addDays(now, -15));
  await repositories.wishlist.create({
    name: 'Noise-cancelling headphones',
    priceCents: 57_900,
    categoryId: 'technology',
    imageUri: null,
    expectedUsageFrequency: 'daily',
    customUsesPerMonth: null,
    expectedOwnershipMonths: 36,
    cooldownDays: 14,
    cooldownStartedAt: headphonesCooldown.startedAt,
    cooldownEndsAt: headphonesCooldown.endsAt,
    reasonTags: ['Work'],
    notes: null,
  });

  const shoes = await repositories.purchases.create({
    name: 'Running shoes',
    purchasePriceCents: 13_000,
    purchaseDate: toIsoDate(addMonths(now, -8)),
    categoryId: 'sport',
    imageUri: null,
    currentResaleValueCents: null,
    expectedUsageFrequency: 'several_times_week',
    customUsesPerMonth: null,
    expectedOwnershipMonths: 24,
  });

  const laptop = await repositories.purchases.create({
    name: 'Laptop',
    purchasePriceCents: 249_900,
    purchaseDate: toIsoDate(addMonths(now, -14)),
    categoryId: 'technology',
    imageUri: null,
    currentResaleValueCents: 140_000,
  });

  const controller = await repositories.purchases.create({
    name: 'DJ controller',
    purchasePriceCents: 89_900,
    purchaseDate: toIsoDate(addMonths(now, -20)),
    categoryId: 'entertainment',
    imageUri: null,
    currentResaleValueCents: 45_000,
  });

  await repositories.expenses.create({
    purchaseId: laptop.id,
    name: 'Docking station',
    amountCents: 12_000,
    expenseType: 'accessory',
    date: toIsoDate(addMonths(now, -13)),
  });
  await repositories.expenses.create({
    purchaseId: laptop.id,
    name: 'Battery replacement',
    amountCents: 9_000,
    expenseType: 'repair',
    date: toIsoDate(addMonths(now, -2)),
  });

  // Spread uses across the ownership period so cost-per-use figures look real.
  await recordUses(repositories, shoes.id, 151, 240, now);
  await recordUses(repositories, laptop.id, 380, 420, now);
  await recordUses(repositories, controller.id, 6, 600, now);

  invalidate('settings', 'commitments', 'wishlist', 'purchases', 'usage', 'expenses');
}

async function recordUses(
  repositories: Repositories,
  purchaseId: string,
  count: number,
  spreadOverDays: number,
  now: Date,
): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    const daysAgo = Math.round((i / Math.max(count - 1, 1)) * spreadOverDays);
    await repositories.usage.recordUse(purchaseId, toIso(addDays(now, -daysAgo)));
  }
}

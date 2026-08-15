import type { Cents, IsoDate, PurchaseExpense, PurchaseWithStats } from '@/types/domain';
import { calendarDaysBetween, calendarMonthsBetween, parseIsoDate } from '@/utils/dates';
import { safeDivide } from '@/utils/numbers';

/**
 * What an owned item has actually cost.
 *
 *   purchase price + additional expenses − current resale value
 *   = current real ownership cost
 *
 *   current real ownership cost ÷ number of uses
 *   = real cost per use
 *
 * Resale value is the user's own estimate of what the item is worth today; it
 * reduces the cost of ownership because that value has not been consumed yet.
 */

export type OwnershipCost = {
  purchasePriceCents: Cents;
  additionalExpensesCents: Cents;
  /** Zero when the user has not entered an estimate. */
  resaleValueCents: Cents;
  /** price + expenses − resale. Negative when the item is worth more than it cost. */
  currentOwnershipCostCents: Cents;
  /** True when resale value exceeds price plus expenses. */
  isNetPositive: boolean;
  /** Whether the user has entered a resale estimate at all. */
  hasResaleEstimate: boolean;
};

export type OwnershipCostInput = {
  purchasePriceCents: Cents;
  additionalExpensesCents: Cents;
  currentResaleValueCents: Cents | null;
};

export function calculateCurrentOwnershipCost(input: OwnershipCostInput): OwnershipCost {
  const purchasePriceCents = safeAmount(input.purchasePriceCents);
  const additionalExpensesCents = safeAmount(input.additionalExpensesCents);
  const hasResaleEstimate = input.currentResaleValueCents != null;
  const resaleValueCents = hasResaleEstimate ? safeAmount(input.currentResaleValueCents ?? 0) : 0;

  const currentOwnershipCostCents = purchasePriceCents + additionalExpensesCents - resaleValueCents;

  return {
    purchasePriceCents,
    additionalExpensesCents,
    resaleValueCents,
    currentOwnershipCostCents,
    isNetPositive: currentOwnershipCostCents < 0,
    hasResaleEstimate,
  };
}

/**
 * Real cost per use, in cents. Not rounded — `formatMoney` rounds at display
 * time. Returns `null` when there are no recorded uses, so the UI can say
 * "No usage data yet" instead of dividing by zero.
 */
export function calculateRealCostPerUse(
  currentOwnershipCostCents: Cents,
  totalUses: number,
): number | null {
  if (!Number.isFinite(totalUses) || totalUses <= 0) return null;
  return safeDivide(currentOwnershipCostCents, totalUses);
}

/** Sums the extra money spent on an item since buying it. */
export function calculateAdditionalExpenses(expenses: readonly PurchaseExpense[]): Cents {
  return expenses.reduce((total, expense) => total + safeAmount(expense.amountCents), 0);
}

export type OwnershipDuration = {
  days: number;
  months: number;
};

/** How long the item has been owned, from its purchase date to `now`. */
export function calculateOwnershipDuration(
  purchaseDate: IsoDate,
  now: Date = new Date(),
): OwnershipDuration | null {
  const purchasedOn = parseIsoDate(purchaseDate);
  if (!purchasedOn) return null;

  const days = Math.max(calendarDaysBetween(purchasedOn, now), 0);
  const months = Math.max(calendarMonthsBetween(purchasedOn, now), 0);

  return { days, months };
}

/**
 * Everything the purchase list and detail screens need, computed in one place
 * so a card and a detail screen can never disagree.
 */
export type PurchaseMetrics = {
  totalUses: number;
  ownership: OwnershipCost;
  /** Cost per use against the *current real* cost. `null` without usage data. */
  realCostPerUseCents: number | null;
  /** Cost per use against the purchase price alone. `null` without usage data. */
  costPerUseFromPriceCents: number | null;
  duration: OwnershipDuration | null;
  /** Average uses per month since purchase. `null` for an item bought today. */
  usesPerMonth: number | null;
};

export function calculatePurchaseMetrics(
  purchase: PurchaseWithStats,
  now: Date = new Date(),
): PurchaseMetrics {
  const ownership = calculateCurrentOwnershipCost({
    purchasePriceCents: purchase.purchasePriceCents,
    additionalExpensesCents: purchase.additionalExpensesCents,
    currentResaleValueCents: purchase.currentResaleValueCents,
  });

  const totalUses = Number.isFinite(purchase.totalUses) ? Math.max(purchase.totalUses, 0) : 0;
  const duration = calculateOwnershipDuration(purchase.purchaseDate, now);

  // Under one month of ownership there is not enough history for a monthly rate.
  const usesPerMonth =
    duration && duration.months >= 1 ? safeDivide(totalUses, duration.months) : null;

  return {
    totalUses,
    ownership,
    realCostPerUseCents: calculateRealCostPerUse(ownership.currentOwnershipCostCents, totalUses),
    costPerUseFromPriceCents: calculateRealCostPerUse(ownership.purchasePriceCents, totalUses),
    duration,
    usesPerMonth,
  };
}

function safeAmount(value: Cents): Cents {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

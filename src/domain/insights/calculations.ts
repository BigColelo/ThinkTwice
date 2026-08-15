import type {
  Cents,
  CategoryId,
  PurchaseWithStats,
  RecurringCommitment,
  WishlistItem,
} from '@/types/domain';
import { parseIso, parseIsoDate } from '@/utils/dates';
import { safeDivide } from '@/utils/numbers';

import { calculatePurchaseMetrics } from '../purchase/calculations';
import {
  calculateTotalAnnualCommitments,
  calculateTotalMonthlyCommitments,
} from '../recurring/calculations';

/**
 * V1 insights: deterministic aggregates over what the user has actually
 * recorded. No behavioural conclusions, no predictions — those need far more
 * history than a first version has.
 */

export type InsightsRange = 'this_year' | 'last_12_months' | 'all_time';

/** The order the ranges are offered in. The UI supplies each one's label. */
export const INSIGHTS_RANGES: readonly InsightsRange[] = [
  'this_year',
  'last_12_months',
  'all_time',
];

export type CategoryBreakdownEntry = {
  categoryId: CategoryId;
  totalCents: Cents;
  /** This category's share of the total, 0–1. */
  share: number;
  purchaseCount: number;
};

export type ValueHighlight = {
  purchaseId: string;
  name: string;
  categoryId: CategoryId;
  imageUri: string | null;
  costPerUseCents: number;
  totalUses: number;
};

/**
 * What these aggregates read of an item the user decided against.
 *
 * Narrow on purpose: a dismissed row keeps everything it had — category, notes,
 * the reasons the user wanted it — and none of the rest is summarised yet. The
 * type grows when a figure needs it, so it always states what is actually read.
 */
export type DismissedItem = Pick<WishlistItem, 'priceCents' | 'decidedAt'>;

export type InsightsSummary = {
  range: InsightsRange;
  purchaseCount: number;
  /** Sum of purchase prices in range. Additional expenses are reported separately. */
  totalTrackedPurchaseValueCents: Cents;
  totalAdditionalExpensesCents: Cents;
  totalUses: number;

  /**
   * Mean real cost per use across items that have at least one recorded use.
   * Items with no usage are excluded rather than counted as infinitely
   * expensive, which would make the average meaningless.
   */
  averageCostPerUseCents: number | null;
  /** How many purchases contributed to the average. Shown so the figure is honest. */
  itemsWithUsage: number;
  itemsWithoutUsage: number;

  /** Lowest real cost per use. `null` until at least one item has usage. */
  bestValue: ValueHighlight | null;
  /** Highest real cost per use. */
  highestCostPerUse: ValueHighlight | null;

  monthlyCommitmentsCents: Cents;
  annualCommitmentsCents: Cents;

  /** Sorted by total, descending. */
  spendingByCategory: CategoryBreakdownEntry[];

  /**
   * Items the user decided against in range, and what they would have cost.
   *
   * A count and a sum, never presented as money saved: the app cannot know
   * whether that money stayed where it was or went somewhere else, and calling
   * it a saving would be exactly the kind of conclusion it does not draw.
   */
  avoidedPurchaseCount: number;
  avoidedPurchaseValueCents: Cents;

  /**
   * True when nothing at all was recorded in range — no purchase and no decision
   * against one — so the screen shows an empty state rather than a page of
   * zeroes. Each section below hides itself on its own data: reporting what the
   * user did not buy is the point of the app as much as reporting what they did,
   * so a wishlist full of decisions is not an empty screen.
   */
  isEmpty: boolean;
};

export type InsightsInput = {
  purchases: readonly PurchaseWithStats[];
  commitments: readonly RecurringCommitment[];
  /**
   * Wishlist items the user decided against. Required rather than optional so a
   * caller that forgets them cannot report "nothing avoided", which would read
   * as a fact rather than as missing data.
   */
  dismissedItems: readonly DismissedItem[];
  range: InsightsRange;
};

export function calculateInsights(input: InsightsInput, now: Date = new Date()): InsightsSummary {
  const purchases = filterPurchasesByRange(input.purchases, input.range, now);
  const dismissed = filterDismissedByRange(input.dismissedItems, input.range, now);

  let totalTrackedPurchaseValueCents = 0;
  let totalAdditionalExpensesCents = 0;
  let totalUses = 0;
  let costPerUseSum = 0;
  let itemsWithUsage = 0;

  let bestValue: ValueHighlight | null = null;
  let highestCostPerUse: ValueHighlight | null = null;

  const byCategory = new Map<CategoryId, { totalCents: Cents; purchaseCount: number }>();

  for (const purchase of purchases) {
    const metrics = calculatePurchaseMetrics(purchase, now);

    totalTrackedPurchaseValueCents += metrics.ownership.purchasePriceCents;
    totalAdditionalExpensesCents += metrics.ownership.additionalExpensesCents;
    totalUses += metrics.totalUses;

    const existing = byCategory.get(purchase.categoryId) ?? { totalCents: 0, purchaseCount: 0 };
    byCategory.set(purchase.categoryId, {
      totalCents: existing.totalCents + metrics.ownership.purchasePriceCents,
      purchaseCount: existing.purchaseCount + 1,
    });

    const costPerUse = metrics.realCostPerUseCents;
    if (costPerUse == null) continue;

    itemsWithUsage += 1;
    costPerUseSum += costPerUse;

    const highlight: ValueHighlight = {
      purchaseId: purchase.id,
      name: purchase.name,
      categoryId: purchase.categoryId,
      imageUri: purchase.imageUri,
      costPerUseCents: costPerUse,
      totalUses: metrics.totalUses,
    };

    if (!bestValue || costPerUse < bestValue.costPerUseCents) bestValue = highlight;
    if (!highestCostPerUse || costPerUse > highestCostPerUse.costPerUseCents) {
      highestCostPerUse = highlight;
    }
  }

  const spendingByCategory: CategoryBreakdownEntry[] = [...byCategory.entries()]
    .map(([categoryId, entry]) => ({
      categoryId,
      totalCents: entry.totalCents,
      purchaseCount: entry.purchaseCount,
      share: safeDivide(entry.totalCents, totalTrackedPurchaseValueCents) ?? 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  // A single item cannot be both the best and the worst value.
  const hasComparison = itemsWithUsage >= 2;

  return {
    range: input.range,
    purchaseCount: purchases.length,
    totalTrackedPurchaseValueCents,
    totalAdditionalExpensesCents,
    totalUses,
    averageCostPerUseCents: itemsWithUsage > 0 ? safeDivide(costPerUseSum, itemsWithUsage) : null,
    itemsWithUsage,
    itemsWithoutUsage: purchases.length - itemsWithUsage,
    bestValue,
    highestCostPerUse: hasComparison ? highestCostPerUse : null,
    monthlyCommitmentsCents: calculateTotalMonthlyCommitments(input.commitments),
    annualCommitmentsCents: calculateTotalAnnualCommitments(input.commitments),
    spendingByCategory,
    avoidedPurchaseCount: dismissed.length,
    avoidedPurchaseValueCents: dismissed.reduce((total, item) => total + item.priceCents, 0),
    isEmpty: purchases.length === 0 && dismissed.length === 0,
  };
}

/** Start of the window a range covers, or `null` when it has no start. */
function rangeStart(range: InsightsRange, now: Date): Date | null {
  if (range === 'all_time') return null;
  return range === 'this_year'
    ? new Date(now.getFullYear(), 0, 1)
    : new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
}

export function filterPurchasesByRange(
  purchases: readonly PurchaseWithStats[],
  range: InsightsRange,
  now: Date = new Date(),
): PurchaseWithStats[] {
  const start = rangeStart(range, now);
  if (!start) return [...purchases];

  return purchases.filter((purchase) => {
    const date = parseIsoDate(purchase.purchaseDate);
    // A purchase with an unreadable date is kept rather than silently dropped.
    return date == null || date.getTime() >= start.getTime();
  });
}

/**
 * Dismissals in range, placed by *when the decision was made* rather than when
 * the item was added: the decision is the event being counted, and an item can
 * be reflected on across the boundary of a range.
 */
export function filterDismissedByRange(
  items: readonly DismissedItem[],
  range: InsightsRange,
  now: Date = new Date(),
): DismissedItem[] {
  const start = rangeStart(range, now);
  if (!start) return [...items];

  return items.filter((item) => {
    const decidedAt = parseIso(item.decidedAt);
    // Kept when there is no readable timestamp, for the same reason as a purchase:
    // dropping it would quietly understate what the user decided against.
    return decidedAt == null || decidedAt.getTime() >= start.getTime();
  });
}

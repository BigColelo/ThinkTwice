import type { Cents, CategoryId, PurchaseWithStats, RecurringCommitment } from '@/types/domain';
import { parseIsoDate } from '@/utils/dates';
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

export const INSIGHTS_RANGES: readonly { id: InsightsRange; label: string }[] = [
  { id: 'this_year', label: 'This year' },
  { id: 'last_12_months', label: 'Last 12 months' },
  { id: 'all_time', label: 'All time' },
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

  /** True when there is nothing to summarise, so the screen shows an empty state. */
  isEmpty: boolean;
};

export type InsightsInput = {
  purchases: readonly PurchaseWithStats[];
  commitments: readonly RecurringCommitment[];
  range: InsightsRange;
};

export function calculateInsights(input: InsightsInput, now: Date = new Date()): InsightsSummary {
  const purchases = filterPurchasesByRange(input.purchases, input.range, now);

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
    isEmpty: purchases.length === 0,
  };
}

export function filterPurchasesByRange(
  purchases: readonly PurchaseWithStats[],
  range: InsightsRange,
  now: Date = new Date(),
): PurchaseWithStats[] {
  if (range === 'all_time') return [...purchases];

  const threshold =
    range === 'this_year'
      ? new Date(now.getFullYear(), 0, 1)
      : new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  return purchases.filter((purchase) => {
    const date = parseIsoDate(purchase.purchaseDate);
    // A purchase with an unreadable date is kept rather than silently dropped.
    return date == null || date.getTime() >= threshold.getTime();
  });
}

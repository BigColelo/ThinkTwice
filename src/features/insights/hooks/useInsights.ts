import { useMemo } from 'react';

import { useDatabaseQuery } from '@/db/useDatabaseQuery';
import { calculateInsights, type InsightsRange, type InsightsSummary } from '@/domain';

/**
 * Insights read everything once and aggregate in memory.
 *
 * That is the right trade-off at this scale: a personal wishlist and purchase
 * history is small, and doing the arithmetic in one tested domain function
 * beats spreading equivalent logic across several SQL aggregates.
 */

export type UseInsightsResult = {
  summary: InsightsSummary | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useInsights(range: InsightsRange): UseInsightsResult {
  // `wishlist` is watched too: deciding against an item changes what was avoided,
  // and without it this screen would keep showing the figure from before.
  const query = useDatabaseQuery(
    ['purchases', 'usage', 'expenses', 'commitments', 'wishlist'],
    async (repositories) => {
      const [purchases, commitments, dismissedItems] = await Promise.all([
        repositories.purchases.list('recent'),
        repositories.commitments.listActive(),
        repositories.wishlist.listDismissed(),
      ]);
      return { purchases, commitments, dismissedItems };
    },
  );

  const summary = useMemo(() => {
    if (!query.data) return null;
    return calculateInsights({
      purchases: query.data.purchases,
      commitments: query.data.commitments,
      dismissedItems: query.data.dismissedItems,
      range,
    });
  }, [query.data, range]);

  return {
    summary,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

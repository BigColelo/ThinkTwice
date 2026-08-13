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
  const query = useDatabaseQuery(
    ['purchases', 'usage', 'expenses', 'commitments'],
    async (repositories) => {
      const [purchases, commitments] = await Promise.all([
        repositories.purchases.list('recent'),
        repositories.commitments.listActive(),
      ]);
      return { purchases, commitments };
    },
  );

  const summary = useMemo(() => {
    if (!query.data) return null;
    return calculateInsights({
      purchases: query.data.purchases,
      commitments: query.data.commitments,
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

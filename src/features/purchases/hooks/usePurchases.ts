import { useMemo } from 'react';

import type { PurchaseSort } from '@/db/repositories';
import { useDatabaseQuery, type QueryResult } from '@/db/useDatabaseQuery';
import { calculatePurchaseMetrics, type PurchaseMetrics } from '@/domain';
import type { PurchaseExpense, PurchaseWithStats, UsageEvent } from '@/types/domain';

/** Reads for owned items. Aggregates come from SQL; metrics are derived here. */

export function usePurchases(sort: PurchaseSort = 'recent'): QueryResult<PurchaseWithStats[]> {
  return useDatabaseQuery(
    ['purchases', 'usage', 'expenses'],
    (repositories) => repositories.purchases.list(sort),
    [sort],
  );
}

export function useRecentPurchases(limit = 3): QueryResult<PurchaseWithStats[]> {
  return useDatabaseQuery(
    ['purchases', 'usage', 'expenses'],
    (repositories) => repositories.purchases.listRecent(limit),
    [limit],
  );
}

/**
 * How many recorded uses the detail screen lists. Enough to find a mistaken tap,
 * few enough that the screen does not become a logbook.
 */
export const RECENT_USES_LIMIT = 10;

export type PurchaseDetail = {
  purchase: PurchaseWithStats;
  expenses: PurchaseExpense[];
  /** The most recent uses, for correcting one recorded by mistake. */
  recentUses: UsageEvent[];
  metrics: PurchaseMetrics;
};

/** A purchase with everything the detail screen shows, in one query pass. */
export function usePurchaseDetail(id: string | undefined): QueryResult<PurchaseDetail | null> {
  const query = useDatabaseQuery(
    ['purchases', 'usage', 'expenses'],
    async (
      repositories,
    ): Promise<{
      purchase: PurchaseWithStats;
      expenses: PurchaseExpense[];
      recentUses: UsageEvent[];
    } | null> => {
      if (!id) return null;
      const purchase = await repositories.purchases.findById(id);
      if (!purchase) return null;

      const [expenses, recentUses] = await Promise.all([
        repositories.expenses.listForPurchase(id),
        repositories.usage.listForPurchase(id, RECENT_USES_LIMIT),
      ]);
      return { purchase, expenses, recentUses };
    },
    [id],
  );

  const data = useMemo<PurchaseDetail | null>(() => {
    if (!query.data) return null;
    return {
      purchase: query.data.purchase,
      expenses: query.data.expenses,
      recentUses: query.data.recentUses,
      metrics: calculatePurchaseMetrics(query.data.purchase),
    };
  }, [query.data]);

  return { ...query, data };
}

import { useMemo } from 'react';

import type { PurchaseSort } from '@/db/repositories';
import { useDatabaseQuery, type QueryResult } from '@/db/useDatabaseQuery';
import { calculatePurchaseMetrics, type PurchaseMetrics } from '@/domain';
import type { PurchaseExpense, PurchaseWithStats } from '@/types/domain';

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

export type PurchaseDetail = {
  purchase: PurchaseWithStats;
  expenses: PurchaseExpense[];
  metrics: PurchaseMetrics;
};

/** A purchase with everything the detail screen shows, in one query pass. */
export function usePurchaseDetail(id: string | undefined): QueryResult<PurchaseDetail | null> {
  const query = useDatabaseQuery(
    ['purchases', 'usage', 'expenses'],
    async (
      repositories,
    ): Promise<{ purchase: PurchaseWithStats; expenses: PurchaseExpense[] } | null> => {
      if (!id) return null;
      const purchase = await repositories.purchases.findById(id);
      if (!purchase) return null;
      const expenses = await repositories.expenses.listForPurchase(id);
      return { purchase, expenses };
    },
    [id],
  );

  const data = useMemo<PurchaseDetail | null>(() => {
    if (!query.data) return null;
    return {
      purchase: query.data.purchase,
      expenses: query.data.expenses,
      metrics: calculatePurchaseMetrics(query.data.purchase),
    };
  }, [query.data]);

  return { ...query, data };
}

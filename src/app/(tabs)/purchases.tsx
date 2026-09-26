import { Settings, ShoppingBag } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { PurchaseSort } from '@/db/repositories';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { PurchaseList } from '@/features/purchases/components/PurchaseList';
import { usePurchases } from '@/features/purchases/hooks/usePurchases';
import { useT } from '@/i18n';
import { PurchaseWithStats } from '@/types/domain';

/**
 * Everything the user owns and tracks. Sorting is done in SQL so the list stays
 * a single query regardless of length, and the rows render through `FlatList`.
 */
export default function PurchasesScreen(): React.ReactElement {
  const t = useT();
  const router = useAppRouter();
  const [sort, setSort] = useState<PurchaseSort>('recent');

  const { data, isLoading, error, refetch, isRefreshing } = usePurchases(sort);

  // Stable, so the list's rows are not all re-created on every render.
  const openPurchase = useCallback(
    (purchase: PurchaseWithStats) => router.push(`/purchase/${purchase.id}`),
    [router],
  );

  const purchases = data ?? [];

  return (
    <>
      <ScreenHeader
        title={t('purchases.listTitle')}
        action={{
          icon: Settings,
          accessibilityLabel: t('common.settings'),
          onPress: () => router.push('/settings'),
        }}
      />

      {error ? (
        <Screen scroll edgeBottom={false}>
          <ErrorState description={t('purchases.listError')} onRetry={refetch} />
        </Screen>
      ) : isLoading ? (
        <Screen>
          <LoadingState />
        </Screen>
      ) : purchases.length === 0 ? (
        <Screen scroll edgeBottom={false}>
          <EmptyState
            icon={ShoppingBag}
            title={t('purchases.emptyTitle')}
            description={t('purchases.emptyDescription')}
            action={{
              label: t('purchases.emptyAction'),
              onPress: () => router.push('/add/purchase'),
            }}
          />
        </Screen>
      ) : (
        <PurchaseList
          purchases={purchases}
          sort={sort}
          onSortChange={setSort}
          onSelect={openPurchase}
          isRefreshing={isRefreshing}
          onRefresh={refetch}
        />
      )}
    </>
  );
}

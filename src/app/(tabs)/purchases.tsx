import { Settings, ShoppingBag } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { PURCHASE_SORTS, type PurchaseSort } from '@/db/repositories';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { PurchaseCard } from '@/features/purchases/components/PurchaseCard';
import { usePurchases } from '@/features/purchases/hooks/usePurchases';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { PurchaseWithStats } from '@/types/domain';

/**
 * Everything the user owns and tracks. Sorting is done in SQL so the list stays
 * a single query regardless of length, and the rows render through `FlatList`.
 */
export default function PurchasesScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useAppRouter();
  const [sort, setSort] = useState<PurchaseSort>('recent');

  const { data, isLoading, error, refetch, isRefreshing } = usePurchases(sort);

  const renderItem = useCallback(
    ({ item }: { item: PurchaseWithStats }) => (
      <PurchaseCard purchase={item} onPress={() => router.push(`/purchase/${item.id}`)} />
    ),
    [router],
  );

  const purchases = data ?? [];
  const hasPurchases = purchases.length > 0;

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
      ) : !hasPurchases ? (
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
        <FlatList
          data={purchases}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={isRefreshing}
          onRefresh={refetch}
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          contentContainerStyle={{
            paddingHorizontal: theme.screenPadding,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.xs,
          }}
          ListHeaderComponent={<SortBar sort={sort} onChange={setSort} count={purchases.length} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );
}

function SortBar({
  sort,
  onChange,
  count,
}: {
  sort: PurchaseSort;
  onChange: (sort: PurchaseSort) => void;
  count: number;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  // Sorting only becomes useful once there is something to reorder.
  if (count < 2) return <View style={{ height: theme.spacing.xs }} />;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('purchases.sort.label')}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        paddingBottom: theme.spacing.sm,
      }}
    >
      {PURCHASE_SORTS.map((option) => (
        <Chip
          key={option}
          label={t(`purchases.sort.${option}`)}
          size="sm"
          selected={option === sort}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  );
}

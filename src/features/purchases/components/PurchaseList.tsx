import React, { useCallback } from 'react';
import { FlatList } from 'react-native';

import type { PurchaseSort } from '@/db/repositories';
import { useTheme } from '@/theme';
import type { PurchaseWithStats } from '@/types/domain';

import { PurchaseCard } from './PurchaseCard';
import { PurchaseSortBar } from './PurchaseSortBar';

/**
 * Everything the user owns, sorted, as a virtualised list — the one list in the
 * app long enough for that to matter. The order is chosen here and applied in
 * SQL by the caller's query, so the list stays one read at any length.
 */
export function PurchaseList({
  purchases,
  sort,
  onSortChange,
  onSelect,
  isRefreshing,
  onRefresh,
}: {
  purchases: readonly PurchaseWithStats[];
  sort: PurchaseSort;
  onSortChange: (sort: PurchaseSort) => void;
  onSelect: (purchase: PurchaseWithStats) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}): React.ReactElement {
  const theme = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: PurchaseWithStats }) => (
      <PurchaseCard purchase={item} onPress={() => onSelect(item)} />
    ),
    [onSelect],
  );

  return (
    <FlatList
      data={purchases}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingHorizontal: theme.screenPadding,
        paddingBottom: theme.spacing.xl,
        gap: theme.spacing.xs,
      }}
      ListHeaderComponent={
        <PurchaseSortBar sort={sort} onChange={onSortChange} count={purchases.length} />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

import { ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingState } from '@/components/ui/StateViews';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { PurchaseWithStats } from '@/types/domain';

import { PurchaseCard } from './PurchaseCard';

/**
 * "Recent purchases" on Home: the last few things bought, each with what it has
 * cost per use so far.
 *
 * "See all" appears only once there is something to see, and an empty list is
 * an invitation to record something already owned rather than a blank card.
 */
export function RecentPurchasesSection({
  purchases,
  isLoading,
  onSelect,
  onSeeAll,
  onAdd,
}: {
  purchases: readonly PurchaseWithStats[] | null;
  isLoading: boolean;
  onSelect: (purchase: PurchaseWithStats) => void;
  onSeeAll: () => void;
  onAdd: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const hasPurchases = purchases != null && purchases.length > 0;

  return (
    <>
      <SectionHeader
        title={t('home.recentPurchases')}
        action={hasPurchases ? { label: t('home.seeAll'), onPress: onSeeAll } : undefined}
      />

      {isLoading ? (
        <LoadingState />
      ) : hasPurchases ? (
        <View style={{ gap: theme.spacing.xs }}>
          {purchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              onPress={() => onSelect(purchase)}
            />
          ))}
        </View>
      ) : (
        <Card padded={false}>
          <EmptyState
            compact
            icon={ShoppingBag}
            title={t('home.purchasesEmptyTitle')}
            description={t('home.purchasesEmptyDescription')}
            action={{ label: t('home.addPurchase'), onPress: onAdd }}
          />
        </Card>
      )}
    </>
  );
}

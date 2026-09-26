import React from 'react';

import { Screen } from '@/components/ui/Screen';
import { Spacer } from '@/components/ui/Spacer';
import { LoadingState } from '@/components/ui/StateViews';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { AvailableCard } from '@/features/money/components/AvailableCard';
import { useMonthlyFinances } from '@/features/money/hooks/useMonthlyFinances';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { RecentPurchasesSection } from '@/features/purchases/components/RecentPurchasesSection';
import { useRecentPurchases } from '@/features/purchases/hooks/usePurchases';
import { WishlistPreviewSection } from '@/features/wishlist/components/WishlistPreviewSection';
import { useWishlistPreview } from '@/features/wishlist/hooks/useWishlist';

/**
 * Home answers three questions, in this order:
 * how much is available this month, what am I thinking about buying, and what
 * have I bought recently.
 */
export default function HomeScreen(): React.ReactElement {
  const router = useAppRouter();

  const { finances, isLoading: isLoadingFinances } = useMonthlyFinances();
  const wishlist = useWishlistPreview(3);
  const purchases = useRecentPurchases(3);

  return (
    <Screen scroll edgeBottom={false}>
      <HomeHeader onOpenSettings={() => router.push('/settings')} />

      {isLoadingFinances ? (
        <LoadingState />
      ) : (
        <AvailableCard finances={finances} onSetUpIncome={() => router.push('/money')} />
      )}

      <Spacer size="xl" />

      <WishlistPreviewSection
        items={wishlist.data}
        isLoading={wishlist.isLoading}
        onSelect={(item) => router.push(`/wishlist/${item.id}`)}
        onSeeAll={() => router.push('/wishlist')}
        onAdd={() => router.push('/add')}
      />

      <Spacer size="xl" />

      <RecentPurchasesSection
        purchases={purchases.data}
        isLoading={purchases.isLoading}
        onSelect={(purchase) => router.push(`/purchase/${purchase.id}`)}
        onSeeAll={() => router.push('/purchases')}
        onAdd={() => router.push('/add/purchase')}
      />
    </Screen>
  );
}

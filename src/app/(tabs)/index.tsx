import { Clock, Settings, ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { ThinkTwiceWordmark } from '@/components/brand/ThinkTwiceMark';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Spacer } from '@/components/ui/Spacer';
import { LoadingState } from '@/components/ui/StateViews';
import { AvailableCard } from '@/features/money/components/AvailableCard';
import { useMonthlyFinances } from '@/features/money/hooks/useMonthlyFinances';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { PurchaseCard } from '@/features/purchases/components/PurchaseCard';
import { useRecentPurchases } from '@/features/purchases/hooks/usePurchases';
import { WishlistCard } from '@/features/wishlist/components/WishlistCard';
import { useWishlistPreview } from '@/features/wishlist/hooks/useWishlist';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * Home answers three questions, in this order:
 * how much is available this month, what am I thinking about buying, and what
 * have I bought recently.
 */
export default function HomeScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useAppRouter();

  const { finances, isLoading: isLoadingFinances } = useMonthlyFinances();
  const wishlist = useWishlistPreview(3);
  const purchases = useRecentPurchases(3);

  return (
    <Screen scroll edgeBottom={false}>
      <View
        style={{
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <ThinkTwiceWordmark />
          <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.xxxs }}>
            {t('home.greeting')}
          </AppText>
        </View>
        <IconButton
          icon={Settings}
          accessibilityLabel={t('common.settings')}
          onPress={() => router.push('/settings')}
        />
      </View>

      {isLoadingFinances ? (
        <LoadingState />
      ) : (
        <AvailableCard finances={finances} onSetUpIncome={() => router.push('/money')} />
      )}

      <Spacer size="xl" />

      <SectionHeader
        title={t('home.thinkingAbout')}
        action={
          wishlist.data && wishlist.data.length > 0
            ? { label: t('home.seeAll'), onPress: () => router.push('/wishlist') }
            : undefined
        }
      />

      {wishlist.isLoading ? (
        <LoadingState />
      ) : wishlist.data && wishlist.data.length > 0 ? (
        <View style={{ gap: theme.spacing.xs }}>
          {wishlist.data.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onPress={() => router.push(`/wishlist/${item.id}`)}
            />
          ))}
        </View>
      ) : (
        <Card padded={false}>
          <EmptyState
            compact
            icon={Clock}
            title={t('home.thinkingEmptyTitle')}
            description={t('home.thinkingEmptyDescription')}
            action={{ label: t('home.addItem'), onPress: () => router.push('/add') }}
          />
        </Card>
      )}

      <Spacer size="xl" />

      <SectionHeader
        title={t('home.recentPurchases')}
        action={
          purchases.data && purchases.data.length > 0
            ? { label: t('home.seeAll'), onPress: () => router.push('/purchases') }
            : undefined
        }
      />

      {purchases.isLoading ? (
        <LoadingState />
      ) : purchases.data && purchases.data.length > 0 ? (
        <View style={{ gap: theme.spacing.xs }}>
          {purchases.data.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              onPress={() => router.push(`/purchase/${purchase.id}`)}
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
            action={{ label: t('home.addPurchase'), onPress: () => router.push('/add/purchase') }}
          />
        </Card>
      )}
    </Screen>
  );
}

import { Clock } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useGoBack } from '@/features/navigation/useGoBack';
import { WishlistCard } from '@/features/wishlist/components/WishlistCard';
import { useWishlist } from '@/features/wishlist/hooks/useWishlist';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * Everything the user is currently considering, grouped by whether the
 * reflection period has elapsed. Items awaiting a decision come first, because
 * they are the ones asking for something.
 */
export default function WishlistScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useAppRouter();
  const { thinking, readyToDecide, isLoading, error, refetch } = useWishlist();
  const goBack = useGoBack();

  const isEmpty = thinking.length === 0 && readyToDecide.length === 0;

  return (
    <>
      <ScreenHeader title={t('wishlistList.title')} onBack={goBack} />

      <Screen scroll>
        {error ? (
          <ErrorState description={t('wishlistList.error')} onRetry={refetch} />
        ) : isLoading ? (
          <LoadingState />
        ) : isEmpty ? (
          <EmptyState
            icon={Clock}
            title={t('wishlistList.emptyTitle')}
            description={t('wishlistList.emptyDescription')}
            action={{ label: t('home.addItem'), onPress: () => router.push('/add/wishlist') }}
          />
        ) : (
          <>
            {readyToDecide.length > 0 ? (
              <>
                <SectionHeader
                  title={t('wishlistList.readyTitle')}
                  subtitle={t('wishlistList.readySubtitle')}
                />
                <View style={{ gap: theme.spacing.xs }}>
                  {readyToDecide.map((item) => (
                    <WishlistCard
                      key={item.id}
                      item={item}
                      onPress={() => router.push(`/wishlist/${item.id}`)}
                    />
                  ))}
                </View>
                <View style={{ height: theme.spacing.xl }} />
              </>
            ) : null}

            {thinking.length > 0 ? (
              <>
                <SectionHeader title={t('wishlistList.thinkingTitle')} />
                <View style={{ gap: theme.spacing.xs }}>
                  {thinking.map((item) => (
                    <WishlistCard
                      key={item.id}
                      item={item}
                      onPress={() => router.push(`/wishlist/${item.id}`)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </Screen>
    </>
  );
}

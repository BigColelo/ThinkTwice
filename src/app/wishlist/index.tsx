import { Clock } from 'lucide-react-native';
import React from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Spacer } from '@/components/ui/Spacer';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useGoBack } from '@/features/navigation/useGoBack';
import { WishlistGroup } from '@/features/wishlist/components/WishlistGroup';
import { useWishlist } from '@/features/wishlist/hooks/useWishlist';
import { useT } from '@/i18n';
import type { WishlistItem } from '@/types/domain';

/**
 * Everything the user is currently considering, grouped by whether the
 * reflection period has elapsed. Items awaiting a decision come first, because
 * they are the ones asking for something.
 */
export default function WishlistScreen(): React.ReactElement {
  const t = useT();
  const router = useAppRouter();
  const { thinking, readyToDecide, isLoading, error, refetch } = useWishlist();
  const goBack = useGoBack();

  const isEmpty = thinking.length === 0 && readyToDecide.length === 0;
  const open = (item: WishlistItem): void => router.push(`/wishlist/${item.id}`);

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
                <WishlistGroup
                  title={t('wishlistList.readyTitle')}
                  subtitle={t('wishlistList.readySubtitle')}
                  items={readyToDecide}
                  onSelect={open}
                />
                <Spacer size="xl" />
              </>
            ) : null}

            {thinking.length > 0 ? (
              <WishlistGroup
                title={t('wishlistList.thinkingTitle')}
                items={thinking}
                onSelect={open}
              />
            ) : null}
          </>
        )}
      </Screen>
    </>
  );
}

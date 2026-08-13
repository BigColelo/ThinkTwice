import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { WishlistCard } from '@/features/wishlist/components/WishlistCard';
import { useWishlist } from '@/features/wishlist/hooks/useWishlist';
import { useTheme } from '@/theme';

/**
 * Everything the user is currently considering, grouped by whether the
 * reflection period has elapsed. Items awaiting a decision come first, because
 * they are the ones asking for something.
 */
export default function WishlistScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const { thinking, readyToDecide, isLoading, error, refetch } = useWishlist();

  const isEmpty = thinking.length === 0 && readyToDecide.length === 0;

  return (
    <>
      <ScreenHeader title="Thinking about" onBack={() => router.back()} />

      <Screen scroll>
        {error ? (
          <ErrorState description="Your wishlist could not be read." onRetry={refetch} />
        ) : isLoading ? (
          <LoadingState />
        ) : isEmpty ? (
          <EmptyState
            icon={Clock}
            title="Nothing on your mind"
            description="Add something you are considering. ThinkTwice will hold on to it and remind you when your reflection period is over."
            action={{ label: 'Add an item', onPress: () => router.push('/add/wishlist') }}
          />
        ) : (
          <>
            {readyToDecide.length > 0 ? (
              <>
                <SectionHeader
                  title="Ready to decide"
                  subtitle="Your reflection period is over for these."
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
                <SectionHeader title="Thinking" />
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

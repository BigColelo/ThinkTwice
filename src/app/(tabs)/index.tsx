import { useRouter } from 'expo-router';
import { Clock, Plus, Settings, ShoppingBag, Wallet } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { ThinkTwiceWordmark } from '@/components/brand/ThinkTwiceMark';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { AppText } from '@/components/ui/AppText';
import { Card, PressableCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { MetricCell, MetricDivider } from '@/components/ui/StatCard';
import { LoadingState } from '@/components/ui/StateViews';
import type { MonthlyFinances } from '@/domain';
import { useMonthlyFinances } from '@/features/money/hooks/useMonthlyFinances';
import { PurchaseCard } from '@/features/purchases/components/PurchaseCard';
import { useRecentPurchases } from '@/features/purchases/hooks/usePurchases';
import { WishlistCard } from '@/features/wishlist/components/WishlistCard';
import { useWishlistPreview } from '@/features/wishlist/hooks/useWishlist';
import { useTheme } from '@/theme';
import { formatPercent } from '@/utils/currency';

/**
 * Home answers three questions, in this order:
 * how much is available this month, what am I thinking about buying, and what
 * have I bought recently.
 */
export default function HomeScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();

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
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            Here&apos;s your overview
          </AppText>
        </View>
        <IconButton
          icon={Settings}
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
        />
      </View>

      {isLoadingFinances ? <LoadingState /> : <AvailableCard finances={finances} />}

      <View style={{ height: theme.spacing.xl }} />

      <SectionHeader
        title="Thinking about"
        action={
          wishlist.data && wishlist.data.length > 0
            ? { label: 'See all', onPress: () => router.push('/wishlist') }
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
            title="Nothing on your mind yet"
            description="Add something you are considering and give yourself time before deciding."
            action={{ label: 'Add an item', onPress: () => router.push('/add') }}
          />
        </Card>
      )}

      <View style={{ height: theme.spacing.xl }} />

      <SectionHeader
        title="Recent purchases"
        action={
          purchases.data && purchases.data.length > 0
            ? { label: 'See all', onPress: () => router.push('/purchases') }
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
            title="No purchases tracked"
            description="Track something you already own to see what it really costs per use."
            action={{ label: 'Add a purchase', onPress: () => router.push('/add/purchase') }}
          />
        </Card>
      )}
    </Screen>
  );
}

/**
 * The headline figure. The ring shows what share of income remains after
 * commitments — the same number, in a second form, never a different one.
 */
function AvailableCard({ finances }: { finances: MonthlyFinances }): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();

  if (!finances.isIncomeConfigured) {
    return (
      <PressableCard
        onPress={() => router.push('/money')}
        accessibilityHint="Opens the Money screen"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.accent.soft,
            }}
          >
            <Wallet
              size={theme.sizes.icon.lg}
              color={theme.colors.accent.base}
              strokeWidth={theme.sizes.iconStrokeWidth}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subheading">Set up your monthly picture</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              Add your net income and recurring commitments to see what stays available.
            </AppText>
          </View>
          <Plus
            size={theme.sizes.icon.md}
            color={theme.colors.text.tertiary}
            strokeWidth={theme.sizes.iconStrokeWidth}
          />
        </View>
      </PressableCard>
    );
  }

  const availableColor = finances.availableAfterCommitmentsCents >= 0 ? 'primary' : 'danger';
  const ringProgress = Math.max(finances.availableToIncomeRatio ?? 0, 0);

  return (
    <Card padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color="secondary">
            Available after commitments
          </AppText>
          <MoneyValue
            cents={finances.availableAfterCommitmentsCents}
            variant="metricLarge"
            color={availableColor}
            style={{ marginTop: theme.spacing.xxs }}
            adjustsFontSizeToFit
            numberOfLines={1}
          />
          <AppText variant="caption" color="tertiary">
            this month
          </AppText>
        </View>

        <ProgressRing
          progress={ringProgress}
          size={68}
          strokeWidth={6}
          accessibilityLabel={`${formatPercent(finances.availableToIncomeRatio)} of monthly income remains available`}
        >
          <AppText variant="subheading">{formatPercent(finances.availableToIncomeRatio)}</AppText>
        </ProgressRing>
      </View>

      <View
        style={{
          height: theme.sizes.hairline,
          backgroundColor: theme.colors.divider,
          marginVertical: theme.spacing.md,
        }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <MetricCell
          label="Net income"
          value={<MoneyValue cents={finances.netIncomeCents} variant="metricSmall" />}
        />
        <MetricDivider />
        <MetricCell
          label="Commitments"
          value={<MoneyValue cents={finances.commitmentsCents} variant="metricSmall" />}
        />
        {finances.savingsTargetCents != null ? (
          <>
            <MetricDivider />
            <MetricCell
              label="Savings goal"
              value={<MoneyValue cents={finances.savingsTargetCents} variant="metricSmall" />}
            />
          </>
        ) : null}
      </View>
    </Card>
  );
}

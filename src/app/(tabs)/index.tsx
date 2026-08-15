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
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { formatPercent } from '@/utils/currency';

/**
 * Home answers three questions, in this order:
 * how much is available this month, what am I thinking about buying, and what
 * have I bought recently.
 */
export default function HomeScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
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
            {t('home.greeting')}
          </AppText>
        </View>
        <IconButton
          icon={Settings}
          accessibilityLabel={t('home.settingsLabel')}
          onPress={() => router.push('/settings')}
        />
      </View>

      {isLoadingFinances ? <LoadingState /> : <AvailableCard finances={finances} />}

      <View style={{ height: theme.spacing.xl }} />

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

      <View style={{ height: theme.spacing.xl }} />

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

/**
 * The headline figure. The ring shows what share of income remains after
 * commitments — the same number, in a second form, never a different one.
 */
function AvailableCard({ finances }: { finances: MonthlyFinances }): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();

  if (!finances.isIncomeConfigured) {
    return (
      <PressableCard onPress={() => router.push('/money')} accessibilityHint={t('home.setUpHint')}>
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
            <AppText variant="subheading">{t('home.setUpTitle')}</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              {t('home.setUpDescription')}
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
            {t('home.availableAfterCommitments')}
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
            {t('home.thisMonth')}
          </AppText>
        </View>

        <ProgressRing
          progress={ringProgress}
          size={68}
          strokeWidth={6}
          accessibilityLabel={t('home.availableRatioLabel', {
            percent: formatPercent(finances.availableToIncomeRatio),
          })}
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
          label={t('home.netIncome')}
          value={<MoneyValue cents={finances.netIncomeCents} variant="metricSmall" />}
        />
        <MetricDivider />
        <MetricCell
          label={t('home.commitments')}
          value={<MoneyValue cents={finances.commitmentsCents} variant="metricSmall" />}
        />
        {finances.savingsTargetCents != null ? (
          <>
            <MetricDivider />
            <MetricCell
              label={t('home.savingsGoal')}
              value={<MoneyValue cents={finances.savingsTargetCents} variant="metricSmall" />}
            />
          </>
        ) : null}
      </View>
    </Card>
  );
}

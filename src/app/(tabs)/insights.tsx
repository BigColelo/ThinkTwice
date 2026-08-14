import { useRouter } from 'expo-router';
import { ChartPie, TrendingDown, TrendingUp } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';

import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { AppText } from '@/components/ui/AppText';
import { Card, PressableCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { getPurchaseCategory } from '@/constants/categories';
import { INSIGHTS_RANGES, type InsightsRange, type ValueHighlight } from '@/domain';
import { AvoidedPurchasesCard } from '@/features/insights/components/AvoidedPurchasesCard';
import { useInsights } from '@/features/insights/hooks/useInsights';
import { useTheme } from '@/theme';
import { pluralize } from '@/utils/dates';

/**
 * Deterministic summaries of what the user has recorded.
 *
 * Nothing here interprets behaviour or predicts anything — V1 reports totals,
 * rates and extremes, and says plainly when there is not enough data yet.
 */
export default function InsightsScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const [range, setRange] = useState<InsightsRange>('this_year');

  const { summary, isLoading, error, refetch } = useInsights(range);

  return (
    <>
      <ScreenHeader title="Insights" />

      <Screen scroll edgeBottom={false}>
        <SegmentedControl
          accessibilityLabel="Time range"
          options={INSIGHTS_RANGES.map((option) => ({ value: option.id, label: option.label }))}
          value={range}
          onChange={setRange}
          size="sm"
        />

        <View style={{ height: theme.spacing.lg }} />

        {error ? (
          <ErrorState description="Your insights could not be calculated." onRetry={refetch} />
        ) : isLoading || !summary ? (
          <LoadingState />
        ) : summary.isEmpty ? (
          <EmptyState
            icon={ChartPie}
            title="No insights yet"
            description="Once you track a few purchases and record some uses, your totals and cost per use appear here."
            action={{ label: 'Add a purchase', onPress: () => router.push('/add/purchase') }}
          />
        ) : (
          <>
            {/* Every block is gated on its own data. A wishlist of decisions and no
                purchases is not an empty screen, but it is not a €0 average either. */}
            {summary.purchaseCount > 0 ? (
              <>
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                  <StatCard
                    label="Tracked purchases"
                    value={
                      <MoneyValue
                        cents={summary.totalTrackedPurchaseValueCents}
                        variant="metric"
                        adjustsFontSizeToFit
                        numberOfLines={1}
                      />
                    }
                    caption={pluralize(summary.purchaseCount, 'item')}
                    style={{ flex: 1 }}
                  />
                  <StatCard
                    label="Average cost/use"
                    value={
                      summary.averageCostPerUseCents == null ? (
                        <AppText variant="metric" color="tertiary">
                          —
                        </AppText>
                      ) : (
                        <MoneyValue
                          cents={summary.averageCostPerUseCents}
                          variant="metric"
                          decimals="always"
                          adjustsFontSizeToFit
                          numberOfLines={1}
                        />
                      )
                    }
                    caption={
                      summary.itemsWithUsage > 0
                        ? `From ${pluralize(summary.itemsWithUsage, 'item')} with uses`
                        : 'No uses recorded yet'
                    }
                    style={{ flex: 1 }}
                  />
                </View>

                {summary.itemsWithoutUsage > 0 ? (
                  <AppText
                    variant="caption"
                    color="tertiary"
                    style={{ marginTop: theme.spacing.xs }}
                  >
                    {`${pluralize(summary.itemsWithoutUsage, 'item')} without recorded uses ${
                      summary.itemsWithoutUsage === 1 ? 'is' : 'are'
                    } excluded from the average.`}
                  </AppText>
                ) : null}
              </>
            ) : null}

            {summary.bestValue ? (
              <>
                <View style={{ height: theme.spacing.xl }} />
                <SectionHeader title="Cost per use" />
                <View style={{ gap: theme.spacing.sm }}>
                  <HighlightCard
                    label="Lowest cost per use"
                    highlight={summary.bestValue}
                    tone="positive"
                    onPress={() => router.push(`/purchase/${summary.bestValue?.purchaseId}`)}
                  />
                  {summary.highestCostPerUse ? (
                    <HighlightCard
                      label="Highest cost per use"
                      highlight={summary.highestCostPerUse}
                      tone="warning"
                      onPress={() =>
                        router.push(`/purchase/${summary.highestCostPerUse?.purchaseId}`)
                      }
                    />
                  ) : null}
                </View>
              </>
            ) : null}

            {summary.spendingByCategory.length > 0 ? (
              <>
                <View style={{ height: theme.spacing.xl }} />
                <SectionHeader title="By category" />
                <Card padding={theme.spacing.md}>
                  <CategoryBarChart items={summary.spendingByCategory} />
                </Card>
              </>
            ) : null}

            {summary.avoidedPurchaseCount > 0 ? (
              <>
                <View style={{ height: theme.spacing.xl }} />
                <SectionHeader title="Decided against" />
                <AvoidedPurchasesCard
                  count={summary.avoidedPurchaseCount}
                  totalCents={summary.avoidedPurchaseValueCents}
                />
              </>
            ) : null}

            <View style={{ height: theme.spacing.xl }} />
            <SectionHeader title="Recurring commitments" />
            <Card padding={theme.spacing.md}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <AppText variant="body" color="secondary">
                  Per month
                </AppText>
                <MoneyValue cents={summary.monthlyCommitmentsCents} variant="bodyStrong" />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: theme.spacing.sm,
                }}
              >
                <AppText variant="body" color="secondary">
                  Per year
                </AppText>
                <MoneyValue cents={summary.annualCommitmentsCents} variant="bodyStrong" />
              </View>
            </Card>
          </>
        )}
      </Screen>
    </>
  );
}

/**
 * A cost-per-use extreme. The label states which extreme it is; colour only
 * reinforces what the words already say.
 */
function HighlightCard({
  label,
  highlight,
  tone,
  onPress,
}: {
  label: string;
  highlight: ValueHighlight;
  tone: 'positive' | 'warning';
  onPress: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const category = getPurchaseCategory(highlight.categoryId);
  const accent = tone === 'positive' ? theme.colors.positive : theme.colors.warning;
  const Icon = tone === 'positive' ? TrendingDown : TrendingUp;

  return (
    <PressableCard
      onPress={onPress}
      padding={theme.spacing.sm}
      accessibilityLabel={`${label}: ${highlight.name}`}
      accessibilityHint="Opens this purchase"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Thumbnail
          uri={highlight.imageUri}
          fallbackIcon={category.icon}
          tint={category.tint}
          size={theme.sizes.thumbnail.md}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }}>
            <Icon size={theme.sizes.icon.xs} color={accent.base} strokeWidth={2.4} />
            <AppText variant="caption" style={{ color: accent.base }}>
              {label}
            </AppText>
          </View>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {highlight.name}
          </AppText>
          <AppText variant="caption" color="secondary">
            {pluralize(highlight.totalUses, 'use')}
          </AppText>
        </View>
        <MoneyValue
          cents={highlight.costPerUseCents}
          variant="bodyStrong"
          decimals="always"
          suffix=" / use"
        />
      </View>
    </PressableCard>
  );
}

import { ChartPie, Settings, TrendingDown, TrendingUp } from 'lucide-react-native';
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
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * Deterministic summaries of what the user has recorded.
 *
 * Nothing here interprets behaviour or predicts anything — V1 reports totals,
 * rates and extremes, and says plainly when there is not enough data yet.
 */
export default function InsightsScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useAppRouter();
  const [range, setRange] = useState<InsightsRange>('this_year');

  const { summary, isLoading, error, refetch } = useInsights(range);

  return (
    <>
      <ScreenHeader
        title={t('insights.title')}
        action={{
          icon: Settings,
          accessibilityLabel: t('common.settings'),
          onPress: () => router.push('/settings'),
        }}
      />

      <Screen scroll edgeBottom={false}>
        <SegmentedControl
          accessibilityLabel={t('insights.rangeLabel')}
          options={INSIGHTS_RANGES.map((option) => ({
            value: option,
            label: t(`insights.range.${option}`),
          }))}
          value={range}
          onChange={setRange}
          size="sm"
        />

        <View style={{ height: theme.spacing.lg }} />

        {error ? (
          <ErrorState description={t('insights.error')} onRetry={refetch} />
        ) : isLoading || !summary ? (
          <LoadingState />
        ) : summary.isEmpty ? (
          <EmptyState
            icon={ChartPie}
            title={t('insights.emptyTitle')}
            description={t('insights.emptyDescription')}
            action={{
              label: t('insights.emptyAction'),
              onPress: () => router.push('/add/purchase'),
            }}
          />
        ) : (
          <>
            {/* Every block is gated on its own data. A wishlist of decisions and no
                purchases is not an empty screen, but it is not a €0 average either. */}
            {summary.purchaseCount > 0 ? (
              <>
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                  <StatCard
                    label={t('insights.trackedPurchases')}
                    value={
                      <MoneyValue
                        cents={summary.totalTrackedPurchaseValueCents}
                        variant="metric"
                        adjustsFontSizeToFit
                        numberOfLines={1}
                      />
                    }
                    caption={t('units.item', { count: summary.purchaseCount })}
                    style={{ flex: 1 }}
                  />
                  <StatCard
                    label={t('insights.averageCostPerUse')}
                    value={
                      summary.averageCostPerUseCents == null ? (
                        <AppText variant="metric" color="tertiary">
                          {t('common.noValue')}
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
                        ? t('insights.fromItemsWithUses', { count: summary.itemsWithUsage })
                        : t('insights.noUsesRecordedYet')
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
                    {t('insights.excludedFromAverage', { count: summary.itemsWithoutUsage })}
                  </AppText>
                ) : null}
              </>
            ) : null}

            {summary.bestValue ? (
              <>
                <View style={{ height: theme.spacing.xl }} />
                <SectionHeader title={t('insights.costPerUseTitle')} />
                <View style={{ gap: theme.spacing.sm }}>
                  <HighlightCard
                    label={t('insights.lowestCostPerUse')}
                    highlight={summary.bestValue}
                    tone="positive"
                    onPress={() => router.push(`/purchase/${summary.bestValue?.purchaseId}`)}
                  />
                  {summary.highestCostPerUse ? (
                    <HighlightCard
                      label={t('insights.highestCostPerUse')}
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
                <SectionHeader title={t('insights.byCategory')} />
                <Card padding={theme.spacing.md}>
                  <CategoryBarChart items={summary.spendingByCategory} />
                </Card>
              </>
            ) : null}

            {summary.avoidedPurchaseCount > 0 ? (
              <>
                <View style={{ height: theme.spacing.xl }} />
                <SectionHeader title={t('insights.decidedAgainst')} />
                <AvoidedPurchasesCard
                  count={summary.avoidedPurchaseCount}
                  totalCents={summary.avoidedPurchaseValueCents}
                />
              </>
            ) : null}

            <View style={{ height: theme.spacing.xl }} />
            <SectionHeader title={t('insights.commitmentsTitle')} />
            <Card padding={theme.spacing.md}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <AppText variant="body" color="secondary">
                  {t('insights.perMonth')}
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
                  {t('insights.perYear')}
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
  const t = useT();
  const category = getPurchaseCategory(highlight.categoryId);
  const accent = tone === 'positive' ? theme.colors.positive : theme.colors.warning;
  const Icon = tone === 'positive' ? TrendingDown : TrendingUp;

  return (
    <PressableCard
      onPress={onPress}
      padding={theme.spacing.sm}
      accessibilityLabel={t('insights.highlightLabel', { label, name: highlight.name })}
      accessibilityHint={t('purchases.openHint')}
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
            {t('units.use', { count: highlight.totalUses })}
          </AppText>
        </View>
        <MoneyValue
          cents={highlight.costPerUseCents}
          variant="bodyStrong"
          decimals="always"
          suffix={` ${t('units.perUse')}`}
        />
      </View>
    </PressableCard>
  );
}

import { ChartPie, Settings } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';

import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spacer } from '@/components/ui/Spacer';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { INSIGHTS_RANGES, type InsightsRange } from '@/domain';
import { AvoidedPurchasesCard } from '@/features/insights/components/AvoidedPurchasesCard';
import { ValueHighlightCard } from '@/features/insights/components/ValueHighlightCard';
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

        <Spacer size="lg" />

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
                <Spacer size="xl" />
                <SectionHeader title={t('insights.costPerUseTitle')} />
                <View style={{ gap: theme.spacing.sm }}>
                  <ValueHighlightCard
                    label={t('insights.lowestCostPerUse')}
                    highlight={summary.bestValue}
                    tone="positive"
                    onPress={() => router.push(`/purchase/${summary.bestValue?.purchaseId}`)}
                  />
                  {summary.highestCostPerUse ? (
                    <ValueHighlightCard
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
                <Spacer size="xl" />
                <SectionHeader title={t('insights.byCategory')} />
                <Card padding={theme.spacing.md}>
                  <CategoryBarChart items={summary.spendingByCategory} />
                </Card>
              </>
            ) : null}

            {summary.avoidedPurchaseCount > 0 ? (
              <>
                <Spacer size="xl" />
                <SectionHeader title={t('insights.decidedAgainst')} />
                <AvoidedPurchasesCard
                  count={summary.avoidedPurchaseCount}
                  totalCents={summary.avoidedPurchaseValueCents}
                />
              </>
            ) : null}

            <Spacer size="xl" />
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

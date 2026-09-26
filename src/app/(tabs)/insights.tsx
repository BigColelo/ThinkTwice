import { ChartPie, Settings } from 'lucide-react-native';
import React, { useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spacer } from '@/components/ui/Spacer';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { INSIGHTS_RANGES, type InsightsRange } from '@/domain';
import { InsightsReport } from '@/features/insights/components/InsightsReport';
import { useInsights } from '@/features/insights/hooks/useInsights';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useT } from '@/i18n';

/**
 * Deterministic summaries of what the user has recorded.
 *
 * Nothing here interprets behaviour or predicts anything — V1 reports totals,
 * rates and extremes, and says plainly when there is not enough data yet.
 */
export default function InsightsScreen(): React.ReactElement {
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
          <InsightsReport
            summary={summary}
            onOpenPurchase={(purchaseId) => router.push(`/purchase/${purchaseId}`)}
          />
        )}
      </Screen>
    </>
  );
}

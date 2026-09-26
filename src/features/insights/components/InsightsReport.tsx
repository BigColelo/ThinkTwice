import React from 'react';
import { View } from 'react-native';

import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Spacer } from '@/components/ui/Spacer';
import { StatCard } from '@/components/ui/StatCard';
import type { InsightsSummary } from '@/domain';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import { AvoidedPurchasesCard } from './AvoidedPurchasesCard';
import { ValueHighlightCard } from './ValueHighlightCard';

/**
 * The summary of a range with something recorded in it.
 *
 * Every block is gated on its own data. A wishlist of decisions and no purchases
 * is not an empty screen, but it is not a €0 average either — so each figure
 * appears only when there is something behind it, and the average says how many
 * items it was taken over, and how many were left out of it.
 */
export function InsightsReport({
  summary,
  onOpenPurchase,
}: {
  summary: InsightsSummary;
  onOpenPurchase: (purchaseId: string) => void;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const { bestValue, highestCostPerUse } = summary;

  return (
    <>
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
            <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.xs }}>
              {t('insights.excludedFromAverage', { count: summary.itemsWithoutUsage })}
            </AppText>
          ) : null}
        </>
      ) : null}

      {bestValue ? (
        <>
          <Spacer size="xl" />
          <SectionHeader title={t('insights.costPerUseTitle')} />
          <View style={{ gap: theme.spacing.sm }}>
            <ValueHighlightCard
              label={t('insights.lowestCostPerUse')}
              highlight={bestValue}
              tone="positive"
              onPress={() => onOpenPurchase(bestValue.purchaseId)}
            />
            {highestCostPerUse ? (
              <ValueHighlightCard
                label={t('insights.highestCostPerUse')}
                highlight={highestCostPerUse}
                tone="warning"
                onPress={() => onOpenPurchase(highestCostPerUse.purchaseId)}
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
  );
}

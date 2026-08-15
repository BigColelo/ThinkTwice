import { Calculator } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { MetricCell, MetricDivider } from '@/components/ui/StatCard';
import { usageFrequencyShortLabel } from '@/constants/usagePresets';
import { calculateEstimatedCostPerUse, calculateEstimatedUses } from '@/domain';
import { formatMonthsAsDuration, useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Cents, UsageFrequencyId } from '@/types/domain';
import { formatNumber } from '@/utils/currency';

/**
 * Live estimate shown while filling in the wishlist form.
 *
 * The inputs behind the number are printed alongside it, so the estimate reads
 * as arithmetic the user can check rather than a figure the app produced.
 */

export function EstimatePreview({
  priceCents,
  frequency,
  customUsesPerMonth,
  expectedOwnershipMonths,
}: {
  priceCents: Cents | null;
  frequency: UsageFrequencyId | null;
  customUsesPerMonth: number | null;
  expectedOwnershipMonths: number | null;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  const estimatedUses = calculateEstimatedUses({
    frequency,
    customUsesPerMonth,
    expectedOwnershipMonths,
  });
  const costPerUse =
    priceCents == null ? null : calculateEstimatedCostPerUse(priceCents, estimatedUses);

  return (
    <Card variant="muted" padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <Calculator
          size={theme.sizes.icon.sm}
          color={theme.colors.text.secondary}
          strokeWidth={theme.sizes.iconStrokeWidth}
        />
        <AppText variant="label" color="secondary">
          {t('wishlist.estimateTitle')}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'stretch', marginTop: theme.spacing.sm }}>
        <MetricCell
          label={t('wishlist.estimatedUses')}
          value={estimatedUses == null ? t('common.noValue') : formatNumber(estimatedUses)}
        />
        <MetricDivider />
        <MetricCell
          label={t('wishlist.estimatedCostPerUse')}
          value={
            costPerUse == null ? (
              <AppText variant="metricSmall" color="tertiary">
                {t('common.noValue')}
              </AppText>
            ) : (
              <MoneyValue
                cents={costPerUse}
                variant="metricSmall"
                decimals="always"
                adjustsFontSizeToFit
                numberOfLines={1}
              />
            )
          }
        />
      </View>

      <AppText
        variant="caption"
        color="tertiary"
        align="center"
        style={{ marginTop: theme.spacing.sm }}
      >
        {frequency && expectedOwnershipMonths
          ? t('wishlist.estimateSummary', {
              frequency: usageFrequencyShortLabel(t, frequency, customUsesPerMonth),
              duration: formatMonthsAsDuration(t, expectedOwnershipMonths),
            })
          : t('wishlist.estimateHint')}
      </AppText>
    </Card>
  );
}

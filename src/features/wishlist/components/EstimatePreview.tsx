import { Calculator } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { MetricCell, MetricDivider } from '@/components/ui/StatCard';
import { usageFrequencyShortLabel } from '@/constants/usagePresets';
import { calculateEstimatedCostPerUse, calculateEstimatedUses } from '@/domain';
import { useTheme } from '@/theme';
import type { Cents, UsageFrequencyId } from '@/types/domain';
import { formatNumber } from '@/utils/currency';
import { formatMonthsAsDuration } from '@/utils/dates';

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
          Estimate
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'stretch', marginTop: theme.spacing.sm }}>
        <MetricCell
          label="estimated uses"
          value={estimatedUses == null ? '—' : formatNumber(estimatedUses)}
        />
        <MetricDivider />
        <MetricCell
          label="estimated cost / use"
          value={
            costPerUse == null ? (
              <AppText variant="metricSmall" color="tertiary">
                —
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
          ? `${usageFrequencyShortLabel(frequency, customUsesPerMonth)} for ${formatMonthsAsDuration(expectedOwnershipMonths)}`
          : 'Choose how often you expect to use it and for how long.'}
      </AppText>
    </Card>
  );
}

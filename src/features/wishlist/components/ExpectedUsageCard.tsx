import { Calendar, Repeat } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { RowDivider } from '@/components/ui/ListRow';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { MetricCell, MetricDivider } from '@/components/ui/StatCard';
import { usageFrequencyShortLabel } from '@/constants/usagePresets';
import type { UsageEstimate } from '@/domain';
import { formatMonthsAsDuration, useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { WishlistItem } from '@/types/domain';
import { formatNumber } from '@/utils/currency';

/**
 * How the user expects to use the item, and what that makes each use cost.
 *
 * The estimate is the same pair the form previewed while the item was being
 * added, computed by the caller the same way — an item's own screen must not
 * disagree with the estimate the decision was made on.
 */
export function ExpectedUsageCard({
  item,
  estimate,
}: {
  item: Pick<
    WishlistItem,
    'expectedUsageFrequency' | 'customUsesPerMonth' | 'expectedOwnershipMonths'
  >;
  estimate: UsageEstimate;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <Card padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
        <Chip
          icon={Repeat}
          label={usageFrequencyShortLabel(t, item.expectedUsageFrequency, item.customUsesPerMonth)}
        />
        <Chip icon={Calendar} label={formatMonthsAsDuration(t, item.expectedOwnershipMonths)} />
      </View>

      <RowDivider spacing="md" />

      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <MetricCell
          label={t('wishlist.estimatedUses')}
          value={
            estimate.estimatedUses == null
              ? t('common.noValue')
              : formatNumber(estimate.estimatedUses)
          }
        />
        <MetricDivider />
        <MetricCell
          label={t('wishlist.estimatedCostPerUse')}
          value={
            estimate.costPerUseCents == null ? (
              <AppText variant="metricSmall" color="tertiary">
                {t('common.noValue')}
              </AppText>
            ) : (
              <MoneyValue
                cents={estimate.costPerUseCents}
                variant="metricSmall"
                decimals="always"
                adjustsFontSizeToFit
                numberOfLines={1}
              />
            )
          }
        />
      </View>
    </Card>
  );
}

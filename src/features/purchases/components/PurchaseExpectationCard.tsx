import { Calendar, Repeat } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { usageFrequencyShortLabel } from '@/constants/usagePresets';
import { formatMonthsAsDuration, useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Purchase } from '@/types/domain';
import { formatNumber } from '@/utils/currency';

/**
 * What the user expected when they bought the item, next to what has actually
 * happened since — the rate they really use it at, once there is enough history
 * for one.
 *
 * Each figure is shown only when it exists: an expectation left blank is not a
 * zero, and a rate for an item bought this week would be noise.
 */
export function PurchaseExpectationCard({
  purchase,
  usesPerMonth,
}: {
  purchase: Pick<
    Purchase,
    'expectedUsageFrequency' | 'customUsesPerMonth' | 'expectedOwnershipMonths'
  >;
  /** The actual average since purchase. `null` under a month of ownership. */
  usesPerMonth: number | null;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <Card padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
        {purchase.expectedUsageFrequency != null ? (
          <Chip
            icon={Repeat}
            label={usageFrequencyShortLabel(
              t,
              purchase.expectedUsageFrequency,
              purchase.customUsesPerMonth,
            )}
          />
        ) : null}
        {usesPerMonth != null ? (
          <Chip
            label={t('purchases.actualRate', { rate: formatNumber(usesPerMonth, 1) })}
            tone="accent"
          />
        ) : null}
        {purchase.expectedOwnershipMonths != null ? (
          <Chip
            icon={Calendar}
            label={formatMonthsAsDuration(t, purchase.expectedOwnershipMonths)}
          />
        ) : null}
      </View>
    </Card>
  );
}

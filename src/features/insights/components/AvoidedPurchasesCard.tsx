import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { MetricCell, MetricDivider } from '@/components/ui/StatCard';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Cents } from '@/types/domain';

/**
 * What the user decided against, and what it would have cost.
 *
 * The figure is stated and then explicitly *not* interpreted: the app has no way
 * of knowing whether that money stayed where it was or went somewhere else, so
 * calling it a saving would be a claim it cannot support — and this is an app
 * that reports rather than concludes. The caption is part of the number.
 */

export function AvoidedPurchasesCard({
  count,
  totalCents,
}: {
  count: number;
  totalCents: Cents;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <Card padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <MetricCell
          label={t('insights.avoidedTotal')}
          value={
            <MoneyValue
              cents={totalCents}
              variant="metric"
              adjustsFontSizeToFit
              numberOfLines={1}
            />
          }
        />
        <MetricDivider />
        <MetricCell label={t('insights.avoidedCountLabel')} value={t('units.item', { count })} />
      </View>

      <View
        style={{
          height: theme.sizes.hairline,
          backgroundColor: theme.colors.divider,
          marginVertical: theme.spacing.md,
        }}
      />

      <AppText variant="caption" color="secondary">
        {t('insights.avoidedCaption')}
      </AppText>
    </Card>
  );
}

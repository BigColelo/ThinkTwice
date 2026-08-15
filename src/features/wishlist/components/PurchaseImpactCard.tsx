import { Info, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip, type ChipTone } from '@/components/ui/Chip';
import { MetricCell, MetricDivider } from '@/components/ui/StatCard';
import type { ImpactLevel, PurchaseImpact } from '@/domain';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { formatNumber, formatPercent } from '@/utils/currency';

/**
 * How the price compares to the user's month.
 *
 * Three figures, plainly stated, and a size label. No recommendation is made
 * and no wording implies one: the app supplies perspective, the user decides.
 * Any figure that cannot be computed shows an explicit unavailable state rather
 * than a placeholder number.
 */

export function PurchaseImpactCard({ impact }: { impact: PurchaseImpact }): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  if (impact.unavailableReason === 'no_income') {
    return (
      <Card padding={theme.spacing.md}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Info
            size={theme.sizes.icon.md}
            color={theme.colors.text.tertiary}
            strokeWidth={theme.sizes.iconStrokeWidth}
          />
          <View style={{ flex: 1 }}>
            <AppText variant="subheading">{t('impact.unavailableTitle')}</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              {t('impact.unavailableDescription')}
            </AppText>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <MetricCell
          label={t('impact.ofMonthlyIncome')}
          value={formatPercent(impact.incomeRatio)}
          valueColor="primary"
        />
        <MetricDivider />
        <MetricCell
          label={t('impact.ofMonthlyAvailable')}
          value={formatPercent(impact.availableRatio)}
          valueColor="primary"
        />
        <MetricDivider />
        <MetricCell
          label={t('impact.monthsOfAvailable')}
          value={
            impact.monthsOfAvailableMoney == null
              ? t('common.noValue')
              : formatNumber(impact.monthsOfAvailableMoney, 1)
          }
          valueColor="primary"
        />
      </View>

      <View
        style={{
          marginTop: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          flexWrap: 'wrap',
        }}
      >
        <Chip
          icon={TrendingUp}
          label={t('impact.chip', { level: t(`impact.level.${impact.level}`) })}
          tone={impactChipTone(impact.level)}
        />
      </View>

      {impact.unavailableReason === 'no_available_money' ? (
        <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.sm }}>
          {t('impact.noAvailableMoney')}
        </AppText>
      ) : null}
    </Card>
  );
}

/**
 * Colour supports the label; it never carries the meaning by itself, which is
 * why the chip always spells the level out.
 */
function impactChipTone(level: ImpactLevel): ChipTone {
  switch (level) {
    case 'low':
      return 'positive';
    case 'moderate':
      return 'info';
    case 'high':
      return 'warning';
    case 'unknown':
      return 'neutral';
  }
}

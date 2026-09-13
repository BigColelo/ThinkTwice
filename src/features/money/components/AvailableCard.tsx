import { Plus, Wallet } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { ProgressRing } from '@/components/charts/ProgressRing';
import { AppText } from '@/components/ui/AppText';
import { Card, PressableCard } from '@/components/ui/Card';
import { RowDivider } from '@/components/ui/ListRow';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { MetricCell, MetricDivider } from '@/components/ui/StatCard';
import type { MonthlyFinances } from '@/domain';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { formatPercent } from '@/utils/currency';

/**
 * The headline figure on Home: what is left of the month after commitments.
 *
 * The ring shows what share of income that is — the same number in a second
 * form, never a different one, which is why the percentage is printed inside it
 * rather than left to the arc.
 *
 * Without an income there is no figure to show and no ratio to draw, so the card
 * becomes the prompt to set one. That is not an empty state: income is what
 * unlocks every impact percentage in the app, and this is the first place a new
 * user looks.
 */

export function AvailableCard({
  finances,
  onSetUpIncome,
}: {
  finances: MonthlyFinances;
  /** Where "set up your income" leads. Navigation belongs to the screen. */
  onSetUpIncome: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  if (!finances.isIncomeConfigured) {
    return (
      <PressableCard onPress={onSetUpIncome} accessibilityHint={t('home.setUpHint')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View
            style={{
              width: theme.sizes.iconTile.lg,
              height: theme.sizes.iconTile.lg,
              borderRadius: theme.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.accent.soft,
            }}
          >
            <Wallet
              size={theme.sizes.icon.lg}
              color={theme.colors.accent.base}
              strokeWidth={theme.sizes.iconStrokeWidth}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subheading">{t('home.setUpTitle')}</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.xxxs }}>
              {t('home.setUpDescription')}
            </AppText>
          </View>
          <Plus
            size={theme.sizes.icon.md}
            color={theme.colors.text.tertiary}
            strokeWidth={theme.sizes.iconStrokeWidth}
          />
        </View>
      </PressableCard>
    );
  }

  const availableColor = finances.availableAfterCommitmentsCents >= 0 ? 'primary' : 'danger';
  // A month in the red has no share of income left to draw; the ring empties
  // rather than wrapping round into a figure that would look like progress.
  const ringProgress = Math.max(finances.availableToIncomeRatio ?? 0, 0);

  return (
    <Card padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color="secondary">
            {t('home.availableAfterCommitments')}
          </AppText>
          <MoneyValue
            cents={finances.availableAfterCommitmentsCents}
            variant="metricLarge"
            color={availableColor}
            style={{ marginTop: theme.spacing.xxs }}
            adjustsFontSizeToFit
            numberOfLines={1}
          />
          <AppText variant="caption" color="tertiary">
            {t('home.thisMonth')}
          </AppText>
        </View>

        <ProgressRing
          progress={ringProgress}
          size={68}
          strokeWidth={6}
          accessibilityLabel={t('home.availableRatioLabel', {
            percent: formatPercent(finances.availableToIncomeRatio),
          })}
        >
          <AppText variant="subheading">{formatPercent(finances.availableToIncomeRatio)}</AppText>
        </ProgressRing>
      </View>

      <RowDivider spacing="md" />

      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <MetricCell
          label={t('home.netIncome')}
          value={<MoneyValue cents={finances.netIncomeCents} variant="metricSmall" />}
        />
        <MetricDivider />
        <MetricCell
          label={t('home.commitments')}
          value={<MoneyValue cents={finances.commitmentsCents} variant="metricSmall" />}
        />
        {finances.savingsTargetCents != null ? (
          <>
            <MetricDivider />
            <MetricCell
              label={t('home.savingsGoal')}
              value={<MoneyValue cents={finances.savingsTargetCents} variant="metricSmall" />}
            />
          </>
        ) : null}
      </View>
    </Card>
  );
}

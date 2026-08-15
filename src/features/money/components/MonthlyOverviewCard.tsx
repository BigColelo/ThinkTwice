import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { MoneyValue } from '@/components/ui/MoneyValue';
import type { MonthlyFinances } from '@/domain';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * The Money screen's summary: income, what leaves it, and what remains.
 *
 * The subtraction is shown line by line rather than as a single result, because
 * the point of the screen is that the user can see where the number comes from.
 */

export function MonthlyOverviewCard({
  finances,
}: {
  finances: MonthlyFinances;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  const availableColor = finances.availableAfterCommitmentsCents >= 0 ? 'positive' : 'danger';

  return (
    <Card padding={theme.spacing.md}>
      <AppText variant="heading">{t('money.overviewTitle')}</AppText>

      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
        <SummaryRow label={t('money.netIncome')} cents={finances.netIncomeCents} />
        <SummaryRow label={t('money.recurringCommitments')} cents={-finances.commitmentsCents} />
        {finances.savingsTargetCents != null ? (
          <SummaryRow label={t('money.savingsGoal')} cents={-finances.savingsTargetCents} />
        ) : null}
      </View>

      <View
        style={{
          height: theme.sizes.hairline,
          backgroundColor: theme.colors.divider,
          marginVertical: theme.spacing.sm,
        }}
      />

      {/* Grouped without an explicit label so React Native composes it from the
          children — otherwise the label would replace the amount and a screen
          reader would announce the row without its number. */}
      <View
        accessible
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <AppText variant="bodyStrong" color={availableColor}>
          {t('money.availableAfterCommitments')}
        </AppText>
        <MoneyValue
          cents={finances.availableAfterCommitmentsCents}
          variant="bodyStrong"
          color={availableColor}
        />
      </View>

      {finances.availableAfterSavingsGoalCents != null ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: theme.spacing.xs,
          }}
        >
          <AppText variant="caption" color="secondary">
            {t('money.availableAfterSavings')}
          </AppText>
          <MoneyValue
            cents={finances.availableAfterSavingsGoalCents}
            variant="caption"
            color="secondary"
          />
        </View>
      ) : null}

      {finances.commitmentsExceedIncome ? (
        <AppText variant="caption" color="warning" style={{ marginTop: theme.spacing.sm }}>
          {t('money.commitmentsExceedIncome')}
        </AppText>
      ) : null}
    </Card>
  );
}

function SummaryRow({ label, cents }: { label: string; cents: number }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <AppText variant="body" color="secondary">
        {label}
      </AppText>
      <MoneyValue cents={cents} variant="body" />
    </View>
  );
}

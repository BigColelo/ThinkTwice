import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { MoneyValue } from '@/components/ui/MoneyValue';
import type { PurchaseMetrics } from '@/domain';
import { EXPENSE_TYPE_LABELS } from '@/features/purchases/schemas/purchaseSchema';
import { useTheme } from '@/theme';
import type { PurchaseExpense } from '@/types/domain';

/**
 * The real-cost sum, shown as a subtraction the user can follow:
 *
 *   purchase price + additional expenses − resale value = current real cost
 *
 * Expenses are grouped by type, so the breakdown stays short whether there is
 * one receipt or twenty.
 */

export function RealCostBreakdown({
  metrics,
  expenses,
}: {
  metrics: PurchaseMetrics;
  expenses: readonly PurchaseExpense[];
}): React.ReactElement {
  const theme = useTheme();
  const { ownership } = metrics;

  const byType = groupByType(expenses);

  return (
    <Card padding={theme.spacing.md}>
      <AppText variant="heading">Real cost</AppText>

      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
        <BreakdownRow label="Purchase price" cents={ownership.purchasePriceCents} />

        {byType.length > 0 ? (
          byType.map(([type, total]) => (
            <BreakdownRow
              key={type}
              label={EXPENSE_TYPE_LABELS[type]}
              cents={total}
              showPositiveSign
            />
          ))
        ) : (
          <BreakdownRow label="Additional expenses" cents={0} showPositiveSign />
        )}

        <BreakdownRow
          label="Resale value"
          cents={ownership.hasResaleEstimate ? -ownership.resaleValueCents : null}
          placeholder="Not set"
        />
      </View>

      <View
        style={{
          height: theme.sizes.hairline,
          backgroundColor: theme.colors.divider,
          marginVertical: theme.spacing.sm,
        }}
      />

      {/* No explicit label: React Native composes one from the children, so the
          amount is announced along with "Current real cost". */}
      <View
        accessible
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <AppText variant="bodyStrong" color={ownership.isNetPositive ? 'positive' : 'primary'}>
          Current real cost
        </AppText>
        <MoneyValue
          cents={ownership.currentOwnershipCostCents}
          variant="bodyStrong"
          color={ownership.isNetPositive ? 'positive' : 'primary'}
        />
      </View>

      {ownership.isNetPositive ? (
        <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.xs }}>
          The resale value you entered is higher than what you have spent on this item so far.
        </AppText>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: theme.spacing.sm,
        }}
      >
        <AppText variant="body" color="secondary">
          Real cost per use
        </AppText>
        {metrics.realCostPerUseCents == null ? (
          <AppText variant="body" color="tertiary">
            No usage data yet
          </AppText>
        ) : (
          <MoneyValue cents={metrics.realCostPerUseCents} variant="bodyStrong" decimals="always" />
        )}
      </View>
    </Card>
  );
}

function BreakdownRow({
  label,
  cents,
  showPositiveSign = false,
  placeholder,
}: {
  label: string;
  cents: number | null;
  showPositiveSign?: boolean;
  placeholder?: string;
}): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <AppText variant="body" color="secondary">
        {label}
      </AppText>
      <MoneyValue
        cents={cents}
        variant="body"
        showPositiveSign={showPositiveSign}
        placeholder={placeholder ?? '—'}
      />
    </View>
  );
}

function groupByType(
  expenses: readonly PurchaseExpense[],
): [PurchaseExpense['expenseType'], number][] {
  const totals = new Map<PurchaseExpense['expenseType'], number>();
  for (const expense of expenses) {
    totals.set(expense.expenseType, (totals.get(expense.expenseType) ?? 0) + expense.amountCents);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

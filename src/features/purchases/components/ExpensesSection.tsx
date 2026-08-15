import { Receipt } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { PurchaseExpense } from '@/types/domain';
import { formatDate } from '@/utils/dates';

/**
 * Everything spent on an item after buying it.
 *
 * A row opens the expense rather than deleting it — a row that looks openable
 * should not destroy itself, and removing is a stated action inside the sheet
 * that opens. With nothing recorded the section explains what belongs here
 * instead of disappearing, because an empty list is not the same as a figure
 * that has nothing to say.
 */

export const ExpensesSection = React.memo(function ExpensesSection({
  expenses,
  onSelect,
}: {
  expenses: readonly PurchaseExpense[];
  onSelect: (expense: PurchaseExpense) => void;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <>
      <SectionHeader
        title={t('purchases.expenses.title')}
        subtitle={
          expenses.length > 0
            ? t('purchases.expenses.recorded', { count: expenses.length })
            : undefined
        }
      />

      {expenses.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            compact
            icon={Receipt}
            title={t('purchases.expenses.emptyTitle')}
            description={t('purchases.expenses.emptyDescription')}
          />
        </Card>
      ) : (
        <Card padding={theme.spacing.md}>
          {expenses.map((expense, index) => (
            <View key={expense.id}>
              {index > 0 ? (
                <View
                  style={{
                    height: theme.sizes.hairline,
                    backgroundColor: theme.colors.divider,
                    marginVertical: theme.spacing.xxs,
                  }}
                />
              ) : null}
              <ListRow
                title={expense.name}
                subtitle={`${t(`purchases.expenses.type.${expense.expenseType}`)}${t('common.dotSeparator')}${formatDate(expense.date)}`}
                trailing={<MoneyValue cents={expense.amountCents} variant="bodyStrong" />}
                onPress={() => onSelect(expense)}
                accessibilityHint={t('purchases.expenses.rowHint')}
              />
            </View>
          ))}
        </Card>
      )}
    </>
  );
});

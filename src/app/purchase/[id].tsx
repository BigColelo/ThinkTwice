import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Pencil, Plus, Repeat, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { usageFrequencyShortLabel } from '@/constants/usagePresets';
import { useRepositories } from '@/db/DatabaseProvider';
import { useDeleteAndLeave } from '@/features/navigation/useDeleteAndLeave';
import { useGoBack } from '@/features/navigation/useGoBack';
import { ExpenseSheet } from '@/features/purchases/components/ExpenseSheet';
import { ExpensesSection } from '@/features/purchases/components/ExpensesSection';
import { PurchaseIdentity } from '@/features/purchases/components/PurchaseIdentity';
import { RealCostBreakdown } from '@/features/purchases/components/RealCostBreakdown';
import { RecentUsesSection } from '@/features/purchases/components/RecentUsesSection';
import { ResaleValueEditor } from '@/features/purchases/components/ResaleValueEditor';
import { UsageActionCard } from '@/features/purchases/components/UsageActionCard';
import { RECENT_USES_LIMIT, usePurchaseDetail } from '@/features/purchases/hooks/usePurchases';
import type { PurchaseExpenseFormValues } from '@/features/purchases/schemas/purchaseSchema';
import {
  addPurchaseExpense,
  deletePurchase,
  removePurchaseExpense,
  removeUse,
  setResaleValue,
  updatePurchaseExpense,
} from '@/features/purchases/services/purchaseActions';
import { formatDuration, formatMonthsAsDuration, useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Cents, PurchaseExpense, UsageEvent } from '@/types/domain';
import { confirm } from '@/utils/confirm';
import { formatNumber } from '@/utils/currency';

/**
 * What an owned item has actually cost, and the one-tap action that keeps that
 * figure meaningful.
 *
 * The screen composes and wires: each section is its own component, and every
 * write goes out through a service from here. The callbacks are stable so that
 * opening or closing the expense sheet does not re-render the lists underneath.
 */
export default function PurchaseDetailScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const repositories = useRepositories();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: liveData, isLoading, error, refetch } = usePurchaseDetail(id);
  // `null` while closed; an empty object while adding; the expense while correcting.
  const [expenseSheet, setExpenseSheet] = useState<{ expense?: PurchaseExpense } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Opened from a link with no history behind it, "back" means the list this
  // purchase belongs to.
  const goBack = useGoBack('/purchases');
  // Deleting removes the row this screen reads, so it keeps the copy it was
  // showing until the navigation away has finished.
  const { data, isDeleting, remove } = useDeleteAndLeave(liveData, goBack);

  const purchaseId = data?.purchase.id;
  const editingExpense = expenseSheet?.expense;

  const openNewExpense = useCallback(() => setExpenseSheet({}), []);
  const openExpense = useCallback((expense: PurchaseExpense) => setExpenseSheet({ expense }), []);
  const closeExpenseSheet = useCallback(() => setExpenseSheet(null), []);

  const handleExpenseSubmit = async (values: PurchaseExpenseFormValues): Promise<void> => {
    if (editingExpense) await updatePurchaseExpense(repositories, editingExpense.id, values);
    else if (purchaseId) await addPurchaseExpense(repositories, { purchaseId, ...values });
    setExpenseSheet(null);
  };

  const handleExpenseDelete = async (expense: PurchaseExpense): Promise<void> => {
    const confirmed = await confirm({
      title: t('purchases.expenses.removeTitle'),
      message: t('purchases.expenses.removeMessage', { name: expense.name }),
      confirmLabel: t('purchases.expenses.removeConfirm'),
      destructive: true,
    });
    if (!confirmed) return;

    await removePurchaseExpense(repositories, expense.id);
    setExpenseSheet(null);
  };

  const handleUseRemove = useCallback(
    async (use: UsageEvent): Promise<void> => {
      await removeUse(repositories, use.id);
    },
    [repositories],
  );

  const handleResaleSave = useCallback(
    async (valueCents: Cents | null): Promise<void> => {
      if (purchaseId) await setResaleValue(repositories, purchaseId, valueCents);
    },
    [repositories, purchaseId],
  );

  const handleDelete = async (): Promise<void> => {
    if (!data) return;
    const confirmed = await confirm({
      title: t('purchases.deleteTitle'),
      message: t('purchases.deleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!confirmed) return;

    setActionError(null);
    try {
      await remove(() => deletePurchase(repositories, data.purchase));
    } catch {
      setActionError(t('purchases.deleteError'));
    }
  };

  if (isLoading) {
    return (
      <>
        <ScreenHeader onBack={goBack} />
        <Screen>
          <LoadingState />
        </Screen>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <ScreenHeader onBack={goBack} />
        <Screen>
          <ErrorState
            title={t('purchases.notFound')}
            description={t('purchases.notFoundDescription')}
            onRetry={refetch}
          />
        </Screen>
      </>
    );
  }

  const { purchase, expenses, recentUses, metrics } = data;

  return (
    <>
      <ScreenHeader
        title={purchase.name}
        onBack={goBack}
        // Editing is the trailing action; deleting sits at the end of the screen,
        // where an irreversible choice is harder to tap by accident — the same
        // arrangement as a wishlist item.
        action={{
          icon: Pencil,
          accessibilityLabel: t('purchases.editLabel'),
          onPress: () => router.push(`/purchase/edit/${purchase.id}`),
        }}
      />

      <Screen scroll>
        <PurchaseIdentity
          purchase={purchase}
          ownedFor={
            metrics.duration
              ? formatDuration(t, metrics.duration.months, metrics.duration.days)
              : null
          }
        />

        <View style={{ height: theme.spacing.lg }} />

        <UsageActionCard
          purchaseId={purchase.id}
          totalUses={metrics.totalUses}
          realCostPerUseCents={metrics.realCostPerUseCents}
          lastUsedAt={purchase.lastUsedAt}
        />

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title={t('purchases.realCost.title')} />
        <RealCostBreakdown metrics={metrics} expenses={expenses} />

        <View style={{ height: theme.spacing.sm }} />
        <Button
          label={t('purchases.addExpense')}
          icon={Plus}
          variant="secondary"
          onPress={openNewExpense}
        />

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title={t('purchases.resaleTitle')} />
        <ResaleValueEditor
          valueCents={purchase.currentResaleValueCents}
          onSave={handleResaleSave}
        />

        <View style={{ height: theme.spacing.xl }} />
        <ExpensesSection expenses={expenses} onSelect={openExpense} />

        {recentUses.length > 0 ? <View style={{ height: theme.spacing.xl }} /> : null}
        <RecentUsesSection uses={recentUses} limit={RECENT_USES_LIMIT} onRemove={handleUseRemove} />

        {purchase.expectedUsageFrequency != null || purchase.expectedOwnershipMonths != null ? (
          <>
            <View style={{ height: theme.spacing.xl }} />
            <SectionHeader
              title={t('purchases.expectationTitle')}
              subtitle={t('purchases.expectationSubtitle')}
            />
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
                {metrics.usesPerMonth != null ? (
                  <Chip
                    label={t('purchases.actualRate', {
                      rate: formatNumber(metrics.usesPerMonth, 1),
                    })}
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
          </>
        ) : null}

        {actionError ? (
          <AppText
            variant="caption"
            color="danger"
            accessibilityRole="alert"
            style={{ marginTop: theme.spacing.md }}
          >
            {actionError}
          </AppText>
        ) : null}

        <View style={{ height: theme.spacing.xl }} />
        <Button
          label={t('purchases.delete')}
          variant="destructive"
          icon={Trash2}
          loading={isDeleting}
          onPress={handleDelete}
        />
      </Screen>

      <ExpenseSheet
        // Remounted per expense, so opening it for another one starts prefilled
        // with that one rather than with whatever was open before.
        key={editingExpense?.id ?? 'new'}
        expense={editingExpense}
        visible={expenseSheet != null}
        onClose={closeExpenseSheet}
        onSubmit={handleExpenseSubmit}
        onDelete={editingExpense ? () => handleExpenseDelete(editingExpense) : undefined}
      />
    </>
  );
}

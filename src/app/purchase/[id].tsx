import { useLocalSearchParams } from 'expo-router';
import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { LoadingScreen, MissingRecordScreen } from '@/components/ui/RecordScreens';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Spacer } from '@/components/ui/Spacer';
import { useRepositories } from '@/db/DatabaseProvider';
import { useConfirm } from '@/features/dialogs/useConfirm';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useDeleteAndLeave } from '@/features/navigation/useDeleteAndLeave';
import { useGoBack } from '@/features/navigation/useGoBack';
import { ExpenseSheet } from '@/features/purchases/components/ExpenseSheet';
import { ExpensesSection } from '@/features/purchases/components/ExpensesSection';
import { PurchaseExpectationCard } from '@/features/purchases/components/PurchaseExpectationCard';
import { PurchaseIdentity } from '@/features/purchases/components/PurchaseIdentity';
import { RealCostBreakdown } from '@/features/purchases/components/RealCostBreakdown';
import { RecentUsesSection } from '@/features/purchases/components/RecentUsesSection';
import { ResaleValueEditor } from '@/features/purchases/components/ResaleValueEditor';
import { UsageActionCard } from '@/features/purchases/components/UsageActionCard';
import { RECENT_USES_LIMIT, usePurchaseDetail } from '@/features/purchases/hooks/usePurchases';
import { PurchaseExpenseFormValues } from '@/features/purchases/schemas/purchaseSchema';
import {
  addPurchaseExpense,
  deletePurchase,
  removePurchaseExpense,
  removeUse,
  setResaleValue,
  updatePurchaseExpense,
} from '@/features/purchases/services/purchaseActions';
import { formatDuration, useT } from '@/i18n';
import { Cents, PurchaseExpense, UsageEvent } from '@/types/domain';

/**
 * What an owned item has actually cost, and the one-tap action that keeps that
 * figure meaningful.
 *
 * The screen composes and wires: each section is its own component, and every
 * write goes out through a service from here. The callbacks are stable so that
 * opening or closing the expense sheet does not re-render the lists underneath.
 */
export default function PurchaseDetailScreen(): React.ReactElement {
  const t = useT();
  const router = useAppRouter();
  const repositories = useRepositories();
  const { id } = useLocalSearchParams<{ id: string }>();
  const confirm = useConfirm();

  const { data: liveData, isLoading, error, refetch } = usePurchaseDetail(id);
  // `null` while closed; an empty object while adding; the expense while correcting.
  const [expenseSheet, setExpenseSheet] = useState<{ expense?: PurchaseExpense } | null>(null);
  const deletion = useAsyncAction();
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

    await deletion.run(() => remove(() => deletePurchase(repositories, data.purchase)), {
      errorMessage: t('purchases.deleteError'),
    });
  };

  if (isLoading) return <LoadingScreen onBack={goBack} />;

  if (error || !data) {
    return (
      <MissingRecordScreen
        onBack={goBack}
        heading={t('purchases.notFound')}
        description={t('purchases.notFoundDescription')}
        onRetry={refetch}
      />
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

        <Spacer size="lg" />

        <UsageActionCard
          purchaseId={purchase.id}
          totalUses={metrics.totalUses}
          realCostPerUseCents={metrics.realCostPerUseCents}
          lastUsedAt={purchase.lastUsedAt}
        />

        <Spacer size="xl" />
        <SectionHeader title={t('purchases.realCost.title')} />
        <RealCostBreakdown metrics={metrics} expenses={expenses} />

        <Spacer size="sm" />
        <Button
          label={t('purchases.addExpense')}
          icon={Plus}
          variant="secondary"
          onPress={openNewExpense}
        />

        <Spacer size="xl" />
        <SectionHeader title={t('purchases.resaleTitle')} />
        <ResaleValueEditor
          valueCents={purchase.currentResaleValueCents}
          onSave={handleResaleSave}
        />

        <Spacer size="xl" />
        <ExpensesSection expenses={expenses} onSelect={openExpense} />

        {recentUses.length > 0 ? <Spacer size="xl" /> : null}
        <RecentUsesSection uses={recentUses} limit={RECENT_USES_LIMIT} onRemove={handleUseRemove} />

        {purchase.expectedUsageFrequency != null || purchase.expectedOwnershipMonths != null ? (
          <>
            <Spacer size="xl" />
            <SectionHeader
              title={t('purchases.expectationTitle')}
              subtitle={t('purchases.expectationSubtitle')}
            />
            <PurchaseExpectationCard purchase={purchase} usesPerMonth={metrics.usesPerMonth} />
          </>
        ) : null}

        <InlineError message={deletion.error} spaceAbove="md" />

        <Spacer size="xl" />
        <Button
          label={t('purchases.delete')}
          variant="destructive"
          icon={Trash2}
          loading={isDeleting}
          onPress={handleDelete}
        />
      </Screen>

      <ExpenseSheet
        // The sheet rebuilds its fields each time it opens, so the same instance
        // serves adding one expense after another and correcting any of them.
        expense={editingExpense}
        visible={expenseSheet != null}
        onClose={closeExpenseSheet}
        onSubmit={handleExpenseSubmit}
        onDelete={editingExpense ? () => handleExpenseDelete(editingExpense) : undefined}
      />
    </>
  );
}

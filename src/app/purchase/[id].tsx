import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Pencil, Plus, Receipt, Repeat, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ItemImage } from '@/components/ui/ItemImage';
import { ListRow } from '@/components/ui/ListRow';
import { MoneyField } from '@/components/ui/MoneyField';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { getPurchaseCategory } from '@/constants/categories';
import { usageFrequencyShortLabel } from '@/constants/usagePresets';
import { useRepositories } from '@/db/DatabaseProvider';
import { useGoBack } from '@/features/navigation/useGoBack';
import { ExpenseSheet } from '@/features/purchases/components/ExpenseSheet';
import { RealCostBreakdown } from '@/features/purchases/components/RealCostBreakdown';
import { UsageActionCard } from '@/features/purchases/components/UsageActionCard';
import { RECENT_USES_LIMIT, usePurchaseDetail } from '@/features/purchases/hooks/usePurchases';
import {
  EXPENSE_TYPE_LABELS,
  type PurchaseExpenseFormValues,
} from '@/features/purchases/schemas/purchaseSchema';
import {
  addPurchaseExpense,
  deletePurchase,
  removePurchaseExpense,
  removeUse,
  setResaleValue,
  updatePurchaseExpense,
} from '@/features/purchases/services/purchaseActions';
import { useTheme } from '@/theme';
import type { Cents, PurchaseExpense } from '@/types/domain';
import { confirm } from '@/utils/confirm';
import { formatDate, formatDateTime, formatMonthsAsDuration, pluralize } from '@/utils/dates';

/**
 * What an owned item has actually cost, and the one-tap action that keeps that
 * figure meaningful.
 */
export default function PurchaseDetailScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const repositories = useRepositories();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error, refetch } = usePurchaseDetail(id);
  // `null` while closed; an empty object while adding; the expense while correcting.
  const [expenseSheet, setExpenseSheet] = useState<{ expense?: PurchaseExpense } | null>(null);
  // Opened from a link with no history behind it, "back" means the list this
  // purchase belongs to.
  const goBack = useGoBack('/purchases');

  const editingExpense = expenseSheet?.expense;

  const handleExpenseSubmit = async (values: PurchaseExpenseFormValues): Promise<void> => {
    if (editingExpense) await updatePurchaseExpense(repositories, editingExpense.id, values);
    else if (data)
      await addPurchaseExpense(repositories, { purchaseId: data.purchase.id, ...values });
    setExpenseSheet(null);
  };

  const handleExpenseDelete = async (expense: PurchaseExpense): Promise<void> => {
    const confirmed = await confirm({
      title: 'Remove this expense?',
      message: `${expense.name} will no longer count towards the real cost.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;

    await removePurchaseExpense(repositories, expense.id);
    setExpenseSheet(null);
  };

  const handleDelete = async (): Promise<void> => {
    if (!data) return;
    const confirmed = await confirm({
      title: 'Delete this purchase?',
      message: 'Its uses and expenses are removed too. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;

    await deletePurchase(repositories, data.purchase);
    goBack();
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
            title="Purchase not found"
            description="This purchase may have been deleted."
            onRetry={refetch}
          />
        </Screen>
      </>
    );
  }

  const { purchase, expenses, recentUses, metrics } = data;
  const category = getPurchaseCategory(purchase.categoryId);

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
          accessibilityLabel: 'Edit purchase',
          onPress: () => router.push(`/purchase/edit/${purchase.id}`),
        }}
      />

      <Screen scroll>
        <ItemImage
          uri={purchase.imageUri}
          height={200}
          style={{ marginBottom: theme.spacing.md }}
        />

        <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
          <AppText variant="title" align="center">
            {purchase.name}
          </AppText>
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.xs,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <Chip label={category.label} icon={category.icon} tint={category.tint} />
            {metrics.duration ? <Chip label={`Owned for ${metrics.duration.label}`} /> : null}
          </View>
          <AppText variant="caption" color="tertiary">
            {`Bought ${formatDate(purchase.purchaseDate)}`}
          </AppText>
        </View>

        <View style={{ height: theme.spacing.lg }} />

        <UsageActionCard
          purchaseId={purchase.id}
          totalUses={metrics.totalUses}
          realCostPerUseCents={metrics.realCostPerUseCents}
          lastUsedAt={purchase.lastUsedAt}
        />

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title="Real cost" />
        <RealCostBreakdown metrics={metrics} expenses={expenses} />

        <View style={{ height: theme.spacing.sm }} />
        <Button
          label="Add expense"
          icon={Plus}
          variant="secondary"
          onPress={() => setExpenseSheet({})}
        />

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title="Current resale value" />
        <ResaleValueEditor purchaseId={purchase.id} valueCents={purchase.currentResaleValueCents} />

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader
          title="Expenses"
          subtitle={expenses.length > 0 ? `${expenses.length} recorded` : undefined}
        />

        {expenses.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              compact
              icon={Receipt}
              title="Nothing spent on this yet"
              description="Accessories, repairs and servicing count towards what this item really costs, so adding them keeps the cost per use honest as it ages."
            />
          </Card>
        ) : null}

        {expenses.length > 0 ? (
          <>
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
                    subtitle={`${EXPENSE_TYPE_LABELS[expense.expenseType]} · ${formatDate(expense.date)}`}
                    trailing={<MoneyValue cents={expense.amountCents} variant="bodyStrong" />}
                    // A tap opens it: a row that looks openable should not delete
                    // itself. Removing is a stated action inside the sheet.
                    onPress={() => setExpenseSheet({ expense })}
                    accessibilityHint="Opens this expense to edit or remove it"
                  />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {recentUses.length > 0 ? (
          <>
            <View style={{ height: theme.spacing.xl }} />
            <SectionHeader
              title="Recent uses"
              // The card's undo covers the tap just made; this covers the one
              // noticed hours later, which is the only way a count kept for years
              // stays worth keeping.
              subtitle={
                recentUses.length === RECENT_USES_LIMIT
                  ? `The last ${RECENT_USES_LIMIT}. Tap one to remove it.`
                  : 'Tap one to remove it.'
              }
            />
            <Card padding={theme.spacing.md}>
              {recentUses.map((use, index) => (
                <View key={use.id}>
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
                    title={formatDateTime(use.occurredAt)}
                    subtitle={use.count > 1 ? pluralize(use.count, 'use') : undefined}
                    onPress={async () => {
                      const confirmed = await confirm({
                        title: 'Remove this use?',
                        message: 'The cost per use is worked out again without it.',
                        confirmLabel: 'Remove',
                        destructive: true,
                      });
                      if (confirmed) await removeUse(repositories, use.id);
                    }}
                    accessibilityHint="Removes this recorded use"
                  />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {purchase.expectedUsageFrequency != null || purchase.expectedOwnershipMonths != null ? (
          <>
            <View style={{ height: theme.spacing.xl }} />
            <SectionHeader
              title="What you expected"
              subtitle="Recorded when you added this item, beside what has happened since."
            />
            <Card padding={theme.spacing.md}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                {purchase.expectedUsageFrequency != null ? (
                  <Chip
                    icon={Repeat}
                    label={usageFrequencyShortLabel(
                      purchase.expectedUsageFrequency,
                      purchase.customUsesPerMonth,
                    )}
                  />
                ) : null}
                {metrics.usesPerMonth != null ? (
                  <Chip
                    label={`Actually ${Math.round(metrics.usesPerMonth * 10) / 10} / month`}
                    tone="accent"
                  />
                ) : null}
                {purchase.expectedOwnershipMonths != null ? (
                  <Chip
                    icon={Calendar}
                    label={formatMonthsAsDuration(purchase.expectedOwnershipMonths)}
                  />
                ) : null}
              </View>
            </Card>
          </>
        ) : null}

        <View style={{ height: theme.spacing.xl }} />
        <Button
          label="Delete this purchase"
          variant="destructive"
          icon={Trash2}
          onPress={handleDelete}
        />
      </Screen>

      <ExpenseSheet
        // Remounted per expense, so opening it for another one starts prefilled
        // with that one rather than with whatever was open before.
        key={editingExpense?.id ?? 'new'}
        expense={editingExpense}
        visible={expenseSheet != null}
        onClose={() => setExpenseSheet(null)}
        onSubmit={handleExpenseSubmit}
        onDelete={editingExpense ? () => handleExpenseDelete(editingExpense) : undefined}
      />
    </>
  );
}

/**
 * Resale value is the only field on this screen the user revises over time, so
 * it is edited in place with an explicit save rather than through a form screen.
 */
function ResaleValueEditor({
  purchaseId,
  valueCents,
}: {
  purchaseId: string;
  valueCents: Cents | null;
}): React.ReactElement {
  const theme = useTheme();
  const repositories = useRepositories();

  const [draft, setDraft] = useState<Cents | null>(valueCents);
  const [lastSavedValue, setLastSavedValue] = useState<Cents | null>(valueCents);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Adopt a value that changed elsewhere (a refetch after saving) without an
  // effect, so the field never renders a frame of stale text.
  if (valueCents !== lastSavedValue) {
    setLastSavedValue(valueCents);
    setDraft(valueCents);
  }

  const hasChanges = draft !== valueCents;

  const save = async (): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await setResaleValue(repositories, purchaseId, draft);
    } catch {
      setSaveError('This could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card padding={theme.spacing.md}>
      <MoneyField
        label="What is it worth today?"
        hint="Your own estimate. It lowers the real cost of ownership, because that value is not spent."
        valueCents={draft}
        onChangeCents={setDraft}
      />

      {saveError ? (
        <AppText
          variant="caption"
          color="danger"
          accessibilityRole="alert"
          style={{ marginTop: theme.spacing.xs }}
        >
          {saveError}
        </AppText>
      ) : null}

      {hasChanges ? (
        <Button
          label="Save resale value"
          size="md"
          onPress={save}
          loading={isSaving}
          style={{ marginTop: theme.spacing.sm }}
        />
      ) : null}
    </Card>
  );
}

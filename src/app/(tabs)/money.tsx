import { Plus, Receipt, Settings } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card, PressableCard } from '@/components/ui/Card';
import { MoneyField } from '@/components/ui/MoneyField';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { calculateTotalAnnualCommitments } from '@/domain';
import { CommitmentRow } from '@/features/money/components/CommitmentRow';
import { MonthlyOverviewCard } from '@/features/money/components/MonthlyOverviewCard';
import { useMonthlyFinances } from '@/features/money/hooks/useMonthlyFinances';
import { buildMonthlyIncomeSchema } from '@/features/money/schemas/commitmentSchema';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Cents } from '@/types/domain';

/**
 * Money describes the user's predictable financial structure — not their daily
 * spending. Income in, recurring commitments out, and what that leaves.
 */
export default function MoneyScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useAppRouter();
  const { finances, commitments, pausedCommitments, isLoading, error, refetch } =
    useMonthlyFinances();

  const annualCommitments = calculateTotalAnnualCommitments(commitments);
  const hasAnyCommitment = commitments.length > 0 || pausedCommitments.length > 0;

  return (
    <>
      <ScreenHeader
        title={t('money.title')}
        action={{
          icon: Settings,
          accessibilityLabel: t('common.settings'),
          onPress: () => router.push('/settings'),
        }}
      />

      <Screen scroll edgeBottom={false}>
        {error ? (
          <ErrorState description={t('money.error')} onRetry={refetch} />
        ) : isLoading ? (
          <LoadingState />
        ) : (
          <>
            <MonthlyOverviewCard finances={finances} />

            <View style={{ height: theme.spacing.xl }} />

            <IncomeEditor />

            <View style={{ height: theme.spacing.xl }} />

            <SectionHeader
              title={t('money.recurringCommitments')}
              subtitle={
                hasAnyCommitment
                  ? pausedCommitments.length > 0
                    ? t('money.activeAndPausedCount', {
                        count: commitments.length,
                        paused: pausedCommitments.length,
                      })
                    : t('money.activeCount', { count: commitments.length })
                  : t('money.commitmentsHint')
              }
            />

            {commitments.length > 0 ? (
              <Card padding={theme.spacing.md}>
                {commitments.map((commitment, index) => (
                  <View key={commitment.id}>
                    {index > 0 ? (
                      <View
                        style={{
                          height: theme.sizes.hairline,
                          backgroundColor: theme.colors.divider,
                          marginVertical: theme.spacing.xxs,
                        }}
                      />
                    ) : null}
                    <CommitmentRow
                      commitment={commitment}
                      onPress={() => router.push(`/money/commitment?id=${commitment.id}`)}
                    />
                  </View>
                ))}

                <View
                  style={{
                    height: theme.sizes.hairline,
                    backgroundColor: theme.colors.divider,
                    marginVertical: theme.spacing.sm,
                  }}
                />

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <AppText variant="caption" color="secondary">
                    {t('money.total')}
                  </AppText>
                  <View style={{ alignItems: 'flex-end' }}>
                    <MoneyValue
                      cents={finances.commitmentsCents}
                      variant="bodyStrong"
                      suffix={` ${t('units.perMonth')}`}
                    />
                    <MoneyValue
                      cents={annualCommitments}
                      variant="caption"
                      color="secondary"
                      suffix={` ${t('units.perYear')}`}
                    />
                  </View>
                </View>
              </Card>
            ) : null}

            {!hasAnyCommitment ? (
              <Card>
                <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
                  <Receipt
                    size={theme.sizes.icon.xl}
                    color={theme.colors.text.tertiary}
                    strokeWidth={theme.sizes.iconStrokeWidth}
                  />
                  <AppText variant="subheading" align="center">
                    {t('money.commitmentsEmptyTitle')}
                  </AppText>
                  <AppText variant="caption" color="secondary" align="center">
                    {t('money.commitmentsEmptyDescription')}
                  </AppText>
                </View>
              </Card>
            ) : null}

            {pausedCommitments.length > 0 ? (
              <>
                <View style={{ height: theme.spacing.lg }} />
                <SectionHeader
                  title={t('money.pausedTitle')}
                  subtitle={t('money.pausedSubtitle')}
                />
                <Card padding={theme.spacing.md}>
                  {pausedCommitments.map((commitment, index) => (
                    <View key={commitment.id}>
                      {index > 0 ? (
                        <View
                          style={{
                            height: theme.sizes.hairline,
                            backgroundColor: theme.colors.divider,
                            marginVertical: theme.spacing.xxs,
                          }}
                        />
                      ) : null}
                      <CommitmentRow
                        commitment={commitment}
                        onPress={() => router.push(`/money/commitment?id=${commitment.id}`)}
                      />
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            <View style={{ height: theme.spacing.sm }} />

            <PressableCard
              variant="outline"
              onPress={() => router.push('/money/commitment')}
              accessibilityLabel={t('money.addCommitment')}
              accessibilityHint={t('money.addCommitmentHint')}
              padding={theme.spacing.sm}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.spacing.xs,
                  minHeight: theme.sizes.control.sm,
                }}
              >
                <Plus
                  size={theme.sizes.icon.md}
                  color={theme.colors.accent.base}
                  strokeWidth={theme.sizes.iconStrokeWidth}
                />
                <AppText variant="button" color="accent">
                  {t('money.addCommitment')}
                </AppText>
              </View>
            </PressableCard>
          </>
        )}
      </Screen>
    </>
  );
}

/**
 * Zero income is how "not set yet" is stored — onboarding can be skipped, and
 * nothing derived from it can be computed until there is a figure. The field
 * shows that as empty rather than as a zero the user never typed, and clearing
 * the field means the same thing again.
 */
function editableIncome(cents: Cents): Cents | null {
  return cents === 0 ? null : cents;
}

/**
 * Inline editing for income and the savings target.
 *
 * Both are single numbers, so a dedicated form screen would add a navigation
 * step for no benefit. Changes are saved explicitly rather than on every
 * keystroke, so a half-typed figure never becomes the stored one.
 */
function IncomeEditor(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const { settings, updateSettings } = useSettings();

  const [incomeCents, setIncomeCents] = useState<Cents | null>(
    editableIncome(settings.monthlyNetIncomeCents),
  );
  const [savingsCents, setSavingsCents] = useState<Cents | null>(
    settings.monthlySavingsTargetCents,
  );
  const [adopted, setAdopted] = useState({
    income: settings.monthlyNetIncomeCents,
    savings: settings.monthlySavingsTargetCents,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ income?: string; savings?: string }>({});

  // This screen stays mounted while the tabs are alive, so settings changed
  // elsewhere (onboarding, a data reset, the dev seed) have to be adopted here
  // or the fields would keep showing figures the app no longer holds. Adjusting
  // during render, rather than in an effect, avoids a frame of stale values.
  if (
    adopted.income !== settings.monthlyNetIncomeCents ||
    adopted.savings !== settings.monthlySavingsTargetCents
  ) {
    setAdopted({
      income: settings.monthlyNetIncomeCents,
      savings: settings.monthlySavingsTargetCents,
    });
    setIncomeCents(editableIncome(settings.monthlyNetIncomeCents));
    setSavingsCents(settings.monthlySavingsTargetCents);
  }

  const hasChanges =
    (incomeCents ?? 0) !== settings.monthlyNetIncomeCents ||
    savingsCents !== settings.monthlySavingsTargetCents;

  const save = async (): Promise<void> => {
    // The parser guarantees integer cents or nothing, but not that the figure
    // makes sense: a pasted minus sign or an extra zero would otherwise be
    // stored and quietly distort every derived number.
    const parsed = buildMonthlyIncomeSchema(t).safeParse({
      monthlyNetIncomeCents: incomeCents ?? 0,
      monthlySavingsTargetCents: savingsCents,
    });

    if (!parsed.success) {
      const errors: { income?: string; savings?: string } = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'monthlyNetIncomeCents') errors.income ??= issue.message;
        if (issue.path[0] === 'monthlySavingsTargetCents') errors.savings ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateSettings(parsed.data);
    } catch {
      setSaveError(t('money.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card padding={theme.spacing.md}>
      <AppText variant="heading">{t('money.setupTitle')}</AppText>

      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.md }}>
        <MoneyField
          label={t('money.incomeLabel')}
          hint={t('money.incomeHint')}
          valueCents={incomeCents}
          onChangeCents={setIncomeCents}
          error={fieldErrors.income}
        />
        <MoneyField
          label={t('money.savingsLabel')}
          hint={t('money.savingsHint')}
          valueCents={savingsCents}
          onChangeCents={setSavingsCents}
          error={fieldErrors.savings}
        />

        {saveError ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            {saveError}
          </AppText>
        ) : null}

        {hasChanges ? (
          <Button label={t('money.saveChanges')} onPress={save} loading={isSaving} size="md" />
        ) : null}
      </View>
    </Card>
  );
}

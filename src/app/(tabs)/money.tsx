import { Plus, Receipt, Settings } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card, PressableCard } from '@/components/ui/Card';
import { RowDivider } from '@/components/ui/ListRow';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Spacer } from '@/components/ui/Spacer';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { calculateTotalAnnualCommitments } from '@/domain';
import { CommitmentRow } from '@/features/money/components/CommitmentRow';
import { IncomeEditor } from '@/features/money/components/IncomeEditor';
import { MonthlyOverviewCard } from '@/features/money/components/MonthlyOverviewCard';
import { useMonthlyFinances } from '@/features/money/hooks/useMonthlyFinances';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

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

            <Spacer size="xl" />

            <IncomeEditor />

            <Spacer size="xl" />

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
                    {index > 0 ? <RowDivider /> : null}
                    <CommitmentRow
                      commitment={commitment}
                      onPress={() => router.push(`/money/commitment?id=${commitment.id}`)}
                    />
                  </View>
                ))}

                <RowDivider spacing="sm" />

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
                <Spacer size="lg" />
                <SectionHeader
                  title={t('money.pausedTitle')}
                  subtitle={t('money.pausedSubtitle')}
                />
                <Card padding={theme.spacing.md}>
                  {pausedCommitments.map((commitment, index) => (
                    <View key={commitment.id}>
                      {index > 0 ? <RowDivider /> : null}
                      <CommitmentRow
                        commitment={commitment}
                        onPress={() => router.push(`/money/commitment?id=${commitment.id}`)}
                      />
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            <Spacer size="sm" />

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

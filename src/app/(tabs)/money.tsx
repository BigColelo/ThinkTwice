import { Settings } from 'lucide-react-native';
import React from 'react';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Spacer } from '@/components/ui/Spacer';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { calculateTotalAnnualCommitments } from '@/domain';
import { CommitmentsSection } from '@/features/money/components/CommitmentsSection';
import { IncomeEditor } from '@/features/money/components/IncomeEditor';
import { MonthlyOverviewCard } from '@/features/money/components/MonthlyOverviewCard';
import { useMonthlyFinances } from '@/features/money/hooks/useMonthlyFinances';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useT } from '@/i18n';

/**
 * Money describes the user's predictable financial structure — not their daily
 * spending. Income in, recurring commitments out, and what that leaves.
 */
export default function MoneyScreen(): React.ReactElement {
  const t = useT();
  const router = useAppRouter();
  const { finances, commitments, pausedCommitments, isLoading, error, refetch } =
    useMonthlyFinances();

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

            <CommitmentsSection
              commitments={commitments}
              pausedCommitments={pausedCommitments}
              monthlyTotalCents={finances.commitmentsCents}
              annualTotalCents={calculateTotalAnnualCommitments(commitments)}
              onSelect={(commitment) => router.push(`/money/commitment?id=${commitment.id}`)}
              onAdd={() => router.push('/money/commitment')}
            />
          </>
        )}
      </Screen>
    </>
  );
}

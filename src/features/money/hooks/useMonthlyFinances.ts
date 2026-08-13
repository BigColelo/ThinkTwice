import { useMemo } from 'react';

import { useDatabaseQuery } from '@/db/useDatabaseQuery';
import { calculateMonthlyFinances, EMPTY_MONTHLY_FINANCES, type MonthlyFinances } from '@/domain';
import { useSettings } from '@/features/settings/SettingsProvider';
import type { RecurringCommitment } from '@/types/domain';

/**
 * The monthly picture, assembled from settings and active commitments.
 *
 * Home, Money, the wishlist form and every impact calculation read from here,
 * so those screens can never show different versions of the same figure.
 */

export type UseMonthlyFinancesResult = {
  finances: MonthlyFinances;
  commitments: RecurringCommitment[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useMonthlyFinances(): UseMonthlyFinancesResult {
  const { settings, isLoading: isLoadingSettings } = useSettings();

  const { data, error, isLoading, refetch } = useDatabaseQuery(['commitments'], (repositories) =>
    repositories.commitments.listActive(),
  );

  const commitments = useMemo(() => data ?? [], [data]);

  const finances = useMemo<MonthlyFinances>(() => {
    if (isLoadingSettings) return EMPTY_MONTHLY_FINANCES;
    return calculateMonthlyFinances({
      monthlyNetIncomeCents: settings.monthlyNetIncomeCents,
      monthlySavingsTargetCents: settings.monthlySavingsTargetCents,
      commitments,
    });
  }, [settings, commitments, isLoadingSettings]);

  return {
    finances,
    commitments,
    isLoading: isLoading || isLoadingSettings,
    error,
    refetch,
  };
}

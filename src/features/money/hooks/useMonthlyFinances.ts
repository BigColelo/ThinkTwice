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
  /** Commitments counting towards the month. */
  commitments: RecurringCommitment[];
  /** Paused commitments: kept in the list, excluded from every total. */
  pausedCommitments: RecurringCommitment[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useMonthlyFinances(): UseMonthlyFinancesResult {
  const { settings, isLoading: isLoadingSettings } = useSettings();

  // Paused commitments are read too, so the Money screen can show them. The
  // totals are unaffected: the domain excludes them itself.
  const { data, error, isLoading, refetch } = useDatabaseQuery(['commitments'], (repositories) =>
    repositories.commitments.listAll(),
  );

  const all = useMemo(() => data ?? [], [data]);

  const { commitments, pausedCommitments } = useMemo(() => {
    const active: RecurringCommitment[] = [];
    const paused: RecurringCommitment[] = [];

    for (const commitment of all) {
      if (commitment.isActive) active.push(commitment);
      else paused.push(commitment);
    }

    return { commitments: active, pausedCommitments: paused };
  }, [all]);

  const finances = useMemo<MonthlyFinances>(() => {
    if (isLoadingSettings) return EMPTY_MONTHLY_FINANCES;
    return calculateMonthlyFinances({
      monthlyNetIncomeCents: settings.monthlyNetIncomeCents,
      monthlySavingsTargetCents: settings.monthlySavingsTargetCents,
      commitments: all,
    });
  }, [settings, all, isLoadingSettings]);

  return {
    finances,
    commitments,
    pausedCommitments,
    isLoading: isLoading || isLoadingSettings,
    error,
    refetch,
  };
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useRepositories } from '@/db/DatabaseProvider';
import { invalidate } from '@/db/dataRevisions';
import type { SettingsUpdate } from '@/db/repositories';
import type { AppSettings } from '@/types/domain';

/**
 * Application settings, held in context because almost every screen needs the
 * currency code and the theme depends on them.
 *
 * Updates write through to SQLite and then update the in-memory copy, so the
 * database stays the source of truth and the UI never drifts from it.
 */

export const FALLBACK_SETTINGS: AppSettings = {
  currencyCode: 'EUR',
  themeMode: 'system',
  monthlyNetIncomeCents: 0,
  monthlySavingsTargetCents: null,
  onboardingCompleted: false,
  cooldownRemindersEnabled: false,
  createdAt: '',
  updatedAt: '',
};

export type SettingsContextValue = {
  settings: AppSettings;
  /** True until the first read from the database resolves. */
  isLoading: boolean;
  updateSettings: (update: SettingsUpdate) => Promise<void>;
  reloadSettings: () => Promise<void>;
};

/**
 * Exported so a test can supply settings directly, without standing up a
 * database just to render a component that needs the currency code.
 */
export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const repositories = useRepositories();
  const [settings, setSettings] = useState<AppSettings>(FALLBACK_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const reloadSettings = useCallback(async () => {
    const loaded = await repositories.settings.get();
    setSettings(loaded);
  }, [repositories]);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const loaded = await repositories.settings.get();
        if (!cancelled) setSettings(loaded);
      } catch {
        // Fall back to defaults: the app stays usable and Settings can be
        // re-saved, rather than the whole tree failing over a preferences read.
        if (!cancelled) setSettings(FALLBACK_SETTINGS);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [repositories]);

  const updateSettings = useCallback(
    async (update: SettingsUpdate) => {
      const saved = await repositories.settings.update(update);
      setSettings(saved);
      invalidate('settings');
    },
    [repositories],
  );

  const value = useMemo(
    () => ({ settings, isLoading, updateSettings, reloadSettings }),
    [settings, isLoading, updateSettings, reloadSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings must be used inside a <SettingsProvider>.');
  }
  return value;
}

/** Shorthand for the many components that only need the currency code. */
export function useCurrency(): AppSettings['currencyCode'] {
  return useSettings().settings.currencyCode;
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useRepositories } from '@/db/DatabaseProvider';
import { invalidate, useDataRevision } from '@/db/dataRevisions';
import type { SettingsUpdate } from '@/db/repositories';
import type { AppSettings } from '@/types/domain';

/**
 * Application settings, held in context because almost every screen needs the
 * currency code and the theme depends on them.
 *
 * Updates write through to SQLite and then update the in-memory copy, so the
 * database stays the source of truth and the UI never drifts from it.
 *
 * The copy also follows the invalidation bus, like every query in the app: a
 * write that names `settings` re-reads the row. That is what keeps it right
 * after the writes that do not come through `updateSettings` — resetting all
 * data, the development seed, turning reminders on — which used to have to
 * remember to call a reload of their own, and each of which could forget to.
 */

export const FALLBACK_SETTINGS: AppSettings = {
  currencyCode: 'EUR',
  themeMode: 'system',
  language: 'system',
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
};

/**
 * Exported so a test can supply settings directly, without standing up a
 * database just to render a component that needs the currency code.
 */
export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const repositories = useRepositories();
  const revision = useDataRevision(['settings']);
  const [settings, setSettings] = useState<AppSettings>(FALLBACK_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Each revision starts a read and cancels the one before it, so a slow
    // earlier read can never land on top of a newer one.
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const loaded = await repositories.settings.get();
        if (!cancelled) setSettings(loaded);
      } catch {
        // Fall back to defaults: the app stays usable and Settings can be
        // re-saved, rather than the whole tree failing over a preferences read.
        // A re-read that fails keeps what is on screen instead — it came from
        // this same database a moment ago, and defaults would send a user who
        // finished onboarding back into it.
        if (!cancelled && !hasLoadedRef.current) setSettings(FALLBACK_SETTINGS);
      } finally {
        if (!cancelled) {
          hasLoadedRef.current = true;
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [repositories, revision]);

  const updateSettings = useCallback(
    async (update: SettingsUpdate) => {
      const saved = await repositories.settings.update(update);
      // Applied now rather than when the re-read below lands, so a control the
      // user has just moved never paints its old position for a frame.
      setSettings(saved);
      invalidate('settings');
    },
    [repositories],
  );

  const value = useMemo(
    () => ({ settings, isLoading, updateSettings }),
    [settings, isLoading, updateSettings],
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

/** The stored language preference, before `system` is resolved to a language. */
export function useLanguagePreference(): AppSettings['language'] {
  return useSettings().settings.language;
}

import type { SQLiteDatabase } from 'expo-sqlite';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { DatabaseInitError, openThinkTwiceDatabase } from './database';
import { createRepositories, type Repositories } from './repositories';

/**
 * Opens the local database once, at app start, and hands the repositories to
 * the tree. Everything below can assume storage is ready.
 */

type DatabaseState =
  | { status: 'loading' }
  | { status: 'ready'; db: SQLiteDatabase; repositories: Repositories }
  | { status: 'error'; error: Error };

const DatabaseContext = createContext<DatabaseState>({ status: 'loading' });

export type DatabaseProviderProps = {
  children: React.ReactNode;
  /** Injectable for tests; defaults to the real on-device database. */
  open?: () => Promise<SQLiteDatabase>;
};

export function DatabaseProvider({ children, open }: DatabaseProviderProps): React.ReactElement {
  const [state, setState] = useState<DatabaseState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      try {
        const db = await (open ? open() : openThinkTwiceDatabase());
        if (cancelled) {
          await db.closeAsync().catch(() => undefined);
          return;
        }
        setState({ status: 'ready', db, repositories: createRepositories(db) });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: 'error',
          error:
            error instanceof Error
              ? error
              : new DatabaseInitError('The local database could not be opened.', error),
        });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, attempt]);

  const value = useMemo(() => state, [state]);

  return (
    <DatabaseContext.Provider value={value}>
      <RetryContext.Provider value={() => setAttempt((current) => current + 1)}>
        {children}
      </RetryContext.Provider>
    </DatabaseContext.Provider>
  );
}

const RetryContext = createContext<() => void>(() => undefined);

export function useDatabaseState(): DatabaseState {
  return useContext(DatabaseContext);
}

/** Retries opening the database after a failure. */
export function useRetryDatabase(): () => void {
  return useContext(RetryContext);
}

/**
 * The repositories. Throws if used above `<DatabaseProvider>` or before the
 * database is ready — screens render below a gate that guarantees both.
 */
export function useRepositories(): Repositories {
  const state = useContext(DatabaseContext);
  if (state.status !== 'ready') {
    throw new Error('useRepositories was called before the database finished opening.');
  }
  return state.repositories;
}

export function useDatabase(): SQLiteDatabase {
  const state = useContext(DatabaseContext);
  if (state.status !== 'ready') {
    throw new Error('useDatabase was called before the database finished opening.');
  }
  return state.db;
}

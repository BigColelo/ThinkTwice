import { useCallback, useEffect, useRef, useState } from 'react';

import { useRepositories } from './DatabaseProvider';
import { useDataRevision, type DataEntity } from './dataRevisions';
import type { Repositories } from './repositories';

/**
 * Reads from the local database and re-reads when the entities it depends on
 * change. Keeping this in one place means screens never deal with loading
 * flags, stale responses or unmounted-component writes themselves.
 */

export type QueryResult<T> = {
  data: T | null;
  error: Error | null;
  /** True only on the first load; a refetch keeps the previous data visible. */
  isLoading: boolean;
  isRefreshing: boolean;
  refetch: () => void;
};

export function useDatabaseQuery<T>(
  /** Entities this query reads. Writing to any of them triggers a refetch. */
  entities: readonly DataEntity[],
  run: (repositories: Repositories) => Promise<T>,
  /** Extra values that should also trigger a refetch (a route id, a sort order). */
  deps: readonly unknown[] = [],
): QueryResult<T> {
  const repositories = useRepositories();
  const revision = useDataRevision(entities);

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // `run` is an inline callback at every call site, so it is deliberately kept
  // out of the effect's dependencies and read through a ref instead. The ref is
  // updated in an effect declared before the one that executes the query, so it
  // is always current by the time the query runs.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  // Guards against a slow earlier query overwriting a newer result.
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (hasLoadedRef.current) setIsRefreshing(true);

    try {
      const result = await runRef.current(repositories);
      if (!mountedRef.current || requestIdRef.current !== requestId) return;
      setData(result);
      setError(null);
    } catch (caught) {
      if (!mountedRef.current || requestIdRef.current !== requestId) return;
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      if (mountedRef.current && requestIdRef.current === requestId) {
        hasLoadedRef.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [repositories]);

  useEffect(() => {
    void execute();
    // `deps` is spread so callers control invalidation explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, revision, ...deps]);

  const refetch = useCallback(() => {
    void execute();
  }, [execute]);

  return { data, error, isLoading, isRefreshing, refetch };
}

import { useSyncExternalStore } from 'react';

/**
 * A tiny invalidation bus.
 *
 * Screens read from SQLite through `useDatabaseQuery`. When something writes,
 * it names the entities it touched and every query watching those entities
 * refetches. This is deliberately not a caching layer: the data lives a
 * millisecond away on the same device, so re-reading it is cheaper and far
 * simpler than keeping a normalised client-side cache in sync.
 */

export type DataEntity =
  'settings' | 'commitments' | 'wishlist' | 'purchases' | 'usage' | 'expenses';

const revisions: Record<DataEntity, number> = {
  settings: 0,
  commitments: 0,
  wishlist: 0,
  purchases: 0,
  usage: 0,
  expenses: 0,
};

const listeners = new Set<() => void>();

/** Marks entities as changed, causing every query that watches them to refetch. */
export function invalidate(...entities: DataEntity[]): void {
  for (const entity of entities) {
    revisions[entity] += 1;
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function revisionOf(entities: readonly DataEntity[]): number {
  let total = 0;
  for (const entity of entities) total += revisions[entity];
  return total;
}

/**
 * Returns a number that changes whenever any of `entities` is invalidated.
 * The snapshot is a plain number so React can compare it by identity.
 */
export function useDataRevision(entities: readonly DataEntity[]): number {
  const key = entities.join(',');
  return useSyncExternalStore(
    subscribe,
    () => revisionOf(key === '' ? [] : (key.split(',') as DataEntity[])),
    () => 0,
  );
}

/** Test helper — resets every counter so cases do not leak into each other. */
export function resetRevisionsForTesting(): void {
  for (const key of Object.keys(revisions) as DataEntity[]) revisions[key] = 0;
  listeners.clear();
}

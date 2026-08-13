import { useMemo } from 'react';

import { useDatabaseQuery, type QueryResult } from '@/db/useDatabaseQuery';
import { resolveWishlistStatus } from '@/domain';
import type { WishlistItem } from '@/types/domain';

/**
 * Open wishlist items, split by whether their reflection period has elapsed.
 *
 * The split is derived from `cooldownEndsAt` at read time rather than trusted
 * from the stored status, so an item is ready to decide the moment its period
 * ends — with no background job, and correctly after the app has been closed.
 */

export type UseWishlistResult = {
  thinking: WishlistItem[];
  readyToDecide: WishlistItem[];
  all: WishlistItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useWishlist(): UseWishlistResult {
  const query = useDatabaseQuery(['wishlist'], async (repositories) => {
    // Persist the elapsed transitions opportunistically so stored status and
    // derived status agree; correctness does not depend on it succeeding.
    await repositories.wishlist.promoteElapsedCooldowns();
    return repositories.wishlist.listOpen();
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  const { thinking, readyToDecide } = useMemo(() => {
    const now = new Date();
    const stillThinking: WishlistItem[] = [];
    const ready: WishlistItem[] = [];

    for (const item of items) {
      if (resolveWishlistStatus(item, now) === 'ready_to_decide') ready.push(item);
      else stillThinking.push(item);
    }

    return { thinking: stillThinking, readyToDecide: ready };
  }, [items]);

  return {
    thinking,
    readyToDecide,
    all: items,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** A single item, for the detail screen. */
export function useWishlistItem(id: string | undefined): QueryResult<WishlistItem | null> {
  return useDatabaseQuery(
    ['wishlist'],
    async (repositories) => (id ? repositories.wishlist.findById(id) : null),
    [id],
  );
}

/** The short preview shown on Home under "Thinking about". */
export function useWishlistPreview(limit = 3): QueryResult<WishlistItem[]> {
  return useDatabaseQuery(
    ['wishlist'],
    (repositories) => repositories.wishlist.listOpenPreview(limit),
    [limit],
  );
}

import { useCallback, useState } from 'react';

/**
 * Deleting the record a detail screen is built from, and leaving with it.
 *
 * The write invalidates the entity the screen reads, so its query re-runs at
 * once and finds the row gone — while the screen is still mounted for the
 * length of the dismissal animation. Left alone it renders "not found", which
 * is a confusing way to acknowledge a deletion the user has just confirmed:
 * the record is missing because they asked for it to be.
 *
 * Holding on to the copy the screen was already showing lets it leave looking
 * exactly as it did. The copy is released if the delete fails, so a screen that
 * turns out to be staying shows what is really there rather than a record that
 * no longer exists.
 */

export type DeleteAndLeave<T> = {
  /** The live record, or — once leaving — the copy the screen was showing. */
  data: T | null;
  /** True from the moment the delete starts until the screen has gone. */
  isDeleting: boolean;
  /** Runs the delete and leaves; rethrows so the screen can report a failure. */
  remove: (deleteRecord: () => Promise<void>) => Promise<void>;
};

export function useDeleteAndLeave<T>(data: T | null, leave: () => void): DeleteAndLeave<T> {
  // Wrapped rather than held bare, so leaving with nothing to show stays
  // distinct from not leaving at all.
  const [leaving, setLeaving] = useState<{ record: T | null } | null>(null);

  const remove = useCallback(
    async (deleteRecord: () => Promise<void>): Promise<void> => {
      // Captured before the write, which is what makes the row disappear.
      setLeaving({ record: data });
      try {
        await deleteRecord();
      } catch (error) {
        setLeaving(null);
        throw error;
      }
      leave();
    },
    [data, leave],
  );

  return { data: data ?? leaving?.record ?? null, isDeleting: leaving != null, remove };
}

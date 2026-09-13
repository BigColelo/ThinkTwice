import { useCallback, useState } from 'react';

/**
 * Running one write from a component: the busy flag, the failure message, and
 * whether it worked.
 *
 * Eight components had written the same twelve lines — a `useState` for the
 * spinner, a `useState` for the message, a `try` that clears the message before
 * and sets it after — and the differences between them were accidents rather
 * than decisions: some cleared the previous error before starting and some did
 * not, some left the button spinning forever when the write threw.
 *
 * One instance per action, not per component. A sheet that can both save and
 * delete has two, so its buttons spin independently and each failure says what
 * actually failed.
 */

export type AsyncAction = {
  /** True while the action is in flight. Drives a button's `loading`. */
  isRunning: boolean;
  /** The message given for the last failure, or `null`. Cleared by the next run. */
  error: string | null;
  /**
   * Runs the action. Resolves `true` when it completed without throwing, so a
   * caller can navigate or close on success without a second `try`.
   *
   * Whatever the action resolves to is discarded — a service that returns the
   * row it wrote is called here for the writing, and a caller that needs the row
   * back is doing something this hook is not for.
   */
  run: (action: () => Promise<unknown>, options: RunOptions) => Promise<boolean>;
  /** Drops a message the user has moved on from, e.g. when a sheet reopens. */
  reset: () => void;
};

export type RunOptions = {
  /** What the user is told when the action throws. Already translated. */
  errorMessage: string;
  /**
   * Keep the busy state after a success, for an action that leaves the screen.
   * Releasing it would let the button paint one frame in its normal state while
   * the navigation is still animating, which reads as the tap having failed.
   */
  stayBusyOnSuccess?: boolean;
};

export function useAsyncAction(): AsyncAction {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<unknown>, options: RunOptions): Promise<boolean> => {
      setIsRunning(true);
      setError(null);
      try {
        await action();
      } catch {
        // The cause is not shown: it is a storage failure with nothing the user
        // can act on, and the message the caller supplies says what did not happen.
        setError(options.errorMessage);
        setIsRunning(false);
        return false;
      }

      if (!options.stayBusyOnSuccess) setIsRunning(false);
      return true;
    },
    [],
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { isRunning, error, run, reset };
}

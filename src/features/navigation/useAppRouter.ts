import { useRouter, type ImperativeRouter } from 'expo-router';
import { useMemo } from 'react';

import { claimNavigation } from './navigationLock';

/**
 * The router every screen navigates with.
 *
 * `push`, `navigate` and `back` are the operations a repeated tap turns into a
 * bug — a second copy of a screen on the stack, or two screens popped for one
 * press — so they ask `claimNavigation` first and the extra call is dropped.
 *
 * `replace` and the `dismiss*` family are deliberately left unguarded:
 *
 * - A repeated `replace` lands on the screen it would have landed on anyway,
 *   never on two of them. Holding it back would be the harmful choice: the
 *   onboarding redirect in the root layout only re-runs when the segments
 *   change, so a swallowed replace would strand the user where they are.
 * - `dismissAll` is never a tap on its own. It is the first half of "leave this
 *   flow, then open the item", and the `push` that follows it in the same
 *   handler is precisely the one that has to get through.
 */
export function useAppRouter(): ImperativeRouter {
  const router = useRouter();

  return useMemo<ImperativeRouter>(
    () => ({
      ...router,
      push: (href, options) => {
        if (claimNavigation()) router.push(href, options);
      },
      navigate: (href, options) => {
        if (claimNavigation()) router.navigate(href, options);
      },
      back: () => {
        if (claimNavigation()) router.back();
      },
    }),
    [router],
  );
}

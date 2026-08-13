import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * A back action that always leads somewhere.
 *
 * Every route in ThinkTwice is URL-addressable — that is what makes deep links
 * and the web build work — so any screen can be the first entry in the history:
 * a link into `/purchase/<id>`, a tapped reminder, a bookmarked page. In that
 * case `router.back()` has nothing to pop and the chevron becomes a control that
 * visibly does nothing. Falling back to a real destination keeps every header
 * honest, at no cost to the normal in-app path.
 */

type Href = Parameters<ReturnType<typeof useRouter>['replace']>[0];

export function useGoBack(fallback: Href = '/'): () => void {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}

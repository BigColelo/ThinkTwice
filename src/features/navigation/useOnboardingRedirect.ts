import { useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAppRouter } from './useAppRouter';

/**
 * Sends first-time users to onboarding and keeps returning users out of it.
 * Implemented as a redirect rather than a separate navigator so every route
 * stays reachable by URL, which is what makes deep links and web work.
 *
 * It is also how resetting all data leaves Settings: the reset clears the
 * onboarding flag, the settings are re-read, and this sends the user back to the
 * start. Nothing else navigates there, so nothing can race it.
 */
export function useOnboardingRedirect(isLoading: boolean, onboardingCompleted: boolean): void {
  const segments = useSegments();
  const router = useAppRouter();

  useEffect(() => {
    if (isLoading) return;

    const isOnOnboarding = segments[0] === 'onboarding';

    if (!onboardingCompleted && !isOnOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingCompleted && isOnOnboarding) {
      router.replace('/');
    }
  }, [isLoading, onboardingCompleted, segments, router]);
}

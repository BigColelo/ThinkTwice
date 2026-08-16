/**
 * One navigation per tap.
 *
 * A handler that navigates is not idempotent: two of them stack two copies of
 * the same screen, or pop two screens for one press. On a device whose JS
 * thread is busy, nothing moves for a moment, the tap looks like it missed, and
 * the user taps again — so the guard cannot live in the button. Two taps on the
 * same control, and two taps on different rows of a list, are the same bug and
 * only a lock shared by every caller catches both.
 *
 * The window is measured from the moment a navigation is *accepted*, not from
 * the tap that asked for it. That is what makes it work on a slow device:
 * however long the taps sat in the queue, their handlers run within
 * milliseconds of each other once the thread frees up.
 */

/**
 * Comfortably longer than a stack transition, far shorter than a second
 * navigation anyone could mean — the destination of the first one is not even
 * on screen yet.
 */
export const NAVIGATION_LOCK_MS = 500;

let blockedUntil = 0;

/**
 * Claims the right to navigate. Returns `false` when a navigation was accepted
 * moments ago, in which case the caller must do nothing at all.
 */
export function claimNavigation(): boolean {
  const now = Date.now();
  if (now < blockedUntil) return false;

  blockedUntil = now + NAVIGATION_LOCK_MS;
  return true;
}

/** Clears the lock between tests, which share this module. */
export function resetNavigationLockForTesting(): void {
  blockedUntil = 0;
}

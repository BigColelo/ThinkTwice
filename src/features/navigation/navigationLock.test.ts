import {
  claimNavigation,
  NAVIGATION_LOCK_MS,
  resetNavigationLockForTesting,
} from './navigationLock';

describe('navigationLock', () => {
  beforeEach(() => {
    // The lock reads the clock, so the clock is the thing the test controls.
    jest.useFakeTimers();
    resetNavigationLockForTesting();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('accepts a navigation when none is in flight', () => {
    expect(claimNavigation()).toBe(true);
  });

  it('drops the repeats of a burst — the case a slow device produces', () => {
    expect(claimNavigation()).toBe(true);
    expect(claimNavigation()).toBe(false);
    expect(claimNavigation()).toBe(false);
  });

  it('is still closed one tick before the window is over', () => {
    expect(claimNavigation()).toBe(true);
    jest.advanceTimersByTime(NAVIGATION_LOCK_MS - 1);

    expect(claimNavigation()).toBe(false);
  });

  it('accepts again once the window has passed', () => {
    expect(claimNavigation()).toBe(true);
    jest.advanceTimersByTime(NAVIGATION_LOCK_MS);

    expect(claimNavigation()).toBe(true);
  });

  it('measures the window from the accepted navigation, not from the dropped ones', () => {
    expect(claimNavigation()).toBe(true);

    // A rejected claim must not push the window further out, or a user tapping
    // steadily on an unresponsive screen would never be let through.
    jest.advanceTimersByTime(NAVIGATION_LOCK_MS - 1);
    expect(claimNavigation()).toBe(false);

    jest.advanceTimersByTime(1);
    expect(claimNavigation()).toBe(true);
  });
});

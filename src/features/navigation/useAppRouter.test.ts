import { renderHook } from '@testing-library/react-native';

import { NAVIGATION_LOCK_MS, resetNavigationLockForTesting } from './navigationLock';
import { useAppRouter } from './useAppRouter';

const mockRouter = {
  push: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismiss: jest.fn(),
  dismissTo: jest.fn(),
  dismissAll: jest.fn(),
  canGoBack: jest.fn(() => true),
  canDismiss: jest.fn(() => true),
  setParams: jest.fn(),
  reload: jest.fn(),
  prefetch: jest.fn(),
};

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

describe('useAppRouter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resetNavigationLockForTesting();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pushes once when one control is tapped twice', async () => {
    const { result } = await renderHook(() => useAppRouter());

    result.current.push('/purchases');
    result.current.push('/purchases');

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });

  it('pushes once when two different rows are tapped in the same burst', async () => {
    const { result } = await renderHook(() => useAppRouter());

    // The case a per-component guard cannot catch: two destinations, one
    // stacked on the other, from a list that scrolled under the second tap.
    result.current.push('/purchases');
    result.current.push('/wishlist');

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/purchases', undefined);
  });

  it('pops once when a back control is tapped twice', async () => {
    const { result } = await renderHook(() => useAppRouter());

    result.current.back();
    result.current.back();

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('holds one lock across the guarded operations', async () => {
    const { result } = await renderHook(() => useAppRouter());

    result.current.push('/purchases');
    result.current.back();
    result.current.navigate('/wishlist');

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('leaves replace alone, since a repeat lands on the same screen either way', async () => {
    const { result } = await renderHook(() => useAppRouter());

    result.current.replace('/');
    result.current.replace('/');

    expect(mockRouter.replace).toHaveBeenCalledTimes(2);
  });

  it('lets the push that follows a dismissAll through — that is how the add flow ends', async () => {
    const { result } = await renderHook(() => useAppRouter());

    result.current.dismissAll();
    result.current.push('/purchases');

    expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });

  it('accepts a deliberate second navigation once the window has passed', async () => {
    const { result } = await renderHook(() => useAppRouter());

    result.current.push('/purchases');
    jest.advanceTimersByTime(NAVIGATION_LOCK_MS);
    result.current.push('/wishlist');

    expect(mockRouter.push).toHaveBeenCalledTimes(2);
  });

  it('passes navigation options through', async () => {
    const { result } = await renderHook(() => useAppRouter());

    result.current.push('/purchases', { withAnchor: true });

    expect(mockRouter.push).toHaveBeenCalledWith('/purchases', { withAnchor: true });
  });
});

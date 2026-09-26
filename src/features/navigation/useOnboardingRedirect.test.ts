import { renderHook } from '@testing-library/react-native';

import { useOnboardingRedirect } from './useOnboardingRedirect';

/**
 * The redirect decides which half of the app a launch lands in, so every state
 * it can meet is asserted — including the one a reset produces, where a user
 * who finished onboarding long ago is sent back to it from inside the app.
 */

const mockRouter = { replace: jest.fn() };
let mockSegments: string[] = [];

jest.mock('expo-router', () => ({ useSegments: () => mockSegments }));
jest.mock('./useAppRouter', () => ({ useAppRouter: () => mockRouter }));

beforeEach(() => {
  jest.clearAllMocks();
  mockSegments = ['(tabs)'];
});

describe('useOnboardingRedirect', () => {
  it('waits until the settings have been read', async () => {
    // Deciding on the fallback copy would send every returning user to onboarding.
    await renderHook(() => useOnboardingRedirect(true, false));

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('sends a first-time user to onboarding', async () => {
    await renderHook(() => useOnboardingRedirect(false, false));

    expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding');
  });

  it('keeps a returning user out of onboarding', async () => {
    mockSegments = ['onboarding'];

    await renderHook(() => useOnboardingRedirect(false, true));

    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('leaves both users alone where they belong', async () => {
    await renderHook(() => useOnboardingRedirect(false, true));
    mockSegments = ['onboarding'];
    await renderHook(() => useOnboardingRedirect(false, false));

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('sends the user back to the start once a reset clears the flag', async () => {
    mockSegments = ['settings'];
    const { rerender } = await renderHook(
      ({ completed }: { completed: boolean }) => useOnboardingRedirect(false, completed),
      { initialProps: { completed: true } },
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await rerender({ completed: false });

    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding');
  });
});

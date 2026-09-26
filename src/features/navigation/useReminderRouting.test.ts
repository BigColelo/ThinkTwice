import { renderHook } from '@testing-library/react-native';

import {
  subscribeToCooldownReminderTaps,
  type CooldownReminderTarget,
} from '@/notifications/cooldownNotifications';

import { useReminderRouting } from './useReminderRouting';

/**
 * A reminder is the one interruption the app allows itself, and it is only worth
 * that if tapping it opens the item it is about.
 */

const mockRouter = { push: jest.fn() };
const mockUnsubscribe = jest.fn();

jest.mock('./useAppRouter', () => ({ useAppRouter: () => mockRouter }));
jest.mock('@/notifications/cooldownNotifications', () => ({
  subscribeToCooldownReminderTaps: jest.fn(() => mockUnsubscribe),
}));

const mockedSubscribe = jest.mocked(subscribeToCooldownReminderTaps);

/** The listener the hook handed to the adapter, as the operating system would call it. */
function tapReminder(target: CooldownReminderTarget): void {
  const listener = mockedSubscribe.mock.calls[0]?.[0];
  if (!listener) throw new Error('Nothing subscribed to reminder taps.');
  listener(target);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useReminderRouting', () => {
  it('opens the item the tapped reminder is about', async () => {
    await renderHook(() => useReminderRouting());

    tapReminder({ wishlistItemId: 'w42' });

    expect(mockRouter.push).toHaveBeenCalledWith('/wishlist/w42');
  });

  it('stops listening when the app shell goes away', async () => {
    const { unmount } = await renderHook(() => useReminderRouting());

    await unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

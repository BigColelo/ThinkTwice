import { fireEvent, screen } from '@testing-library/react-native';

import {
  disableCooldownReminders,
  enableCooldownReminders,
} from '@/features/settings/services/reminderActions';
import {
  areLocalNotificationsSupported,
  localNotificationsUnavailableReason,
} from '@/notifications/cooldownNotifications';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RemindersCard } from './RemindersCard';

jest.mock('@/db/DatabaseProvider', () => ({
  // The card only forwards this to the services, which are mocked below.
  useRepositories: () => ({}),
}));

jest.mock('@/features/settings/services/reminderActions', () => ({
  enableCooldownReminders: jest.fn(async () => ({ status: 'enabled', scheduled: 0 })),
  disableCooldownReminders: jest.fn(async () => undefined),
}));

jest.mock('@/notifications/cooldownNotifications', () => ({
  areLocalNotificationsSupported: jest.fn(() => true),
  localNotificationsUnavailableReason: jest.fn(() => null),
}));

/**
 * One switch with three ways for "on" to end — on, refused, impossible — so the
 * card is asserted on what it tells the user after each, and on never leaving a
 * disabled switch unexplained.
 */

const enableMock = jest.mocked(enableCooldownReminders);
const disableMock = jest.mocked(disableCooldownReminders);
const supportedMock = jest.mocked(areLocalNotificationsSupported);
const reasonMock = jest.mocked(localNotificationsUnavailableReason);

function reminderSwitch(): ReturnType<typeof screen.getByLabelText> {
  return screen.getByLabelText('Reflection reminders');
}

beforeEach(() => {
  jest.clearAllMocks();
  supportedMock.mockReturnValue(true);
  reasonMock.mockReturnValue(null);
  enableMock.mockResolvedValue({ status: 'enabled', scheduled: 0 });
});

describe('RemindersCard', () => {
  it('shows the stored value', async () => {
    await renderWithProviders(<RemindersCard />, {
      settings: { cooldownRemindersEnabled: true },
    });

    expect(reminderSwitch().props.value).toBe(true);
  });

  it('turns reminders on, and counts the items already waiting that are now covered', async () => {
    enableMock.mockResolvedValueOnce({ status: 'enabled', scheduled: 3 });
    await renderWithProviders(<RemindersCard />);

    await fireEvent(reminderSwitch(), 'valueChange', true);

    expect(enableMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('Reminders are on. 3 items already waiting will remind you too.'),
    ).toBeTruthy();
  });

  it('says plainly when nothing was waiting', async () => {
    await renderWithProviders(<RemindersCard />);

    await fireEvent(reminderSwitch(), 'valueChange', true);

    expect(
      screen.getByText('Reminders are on. New reflection periods will end with a reminder.'),
    ).toBeTruthy();
  });

  it('explains a refused permission instead of leaving the switch off in silence', async () => {
    enableMock.mockResolvedValueOnce({ status: 'denied' });
    await renderWithProviders(<RemindersCard />);

    await fireEvent(reminderSwitch(), 'valueChange', true);

    expect(screen.getByText(/Notifications are turned off for ThinkTwice/)).toBeTruthy();
    // A refusal is the user's answer, not a failure.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('turns reminders off', async () => {
    await renderWithProviders(<RemindersCard />, {
      settings: { cooldownRemindersEnabled: true },
    });

    await fireEvent(reminderSwitch(), 'valueChange', false);

    expect(disableMock).toHaveBeenCalledTimes(1);
    expect(enableMock).not.toHaveBeenCalled();
  });

  it('reports a failure as one', async () => {
    enableMock.mockRejectedValueOnce(new Error('database is locked'));
    await renderWithProviders(<RemindersCard />);

    await fireEvent(reminderSwitch(), 'valueChange', true);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This setting could not be saved. Please try again.',
    );
  });

  it('disables the switch where reminders cannot exist, and says why', async () => {
    supportedMock.mockReturnValue(false);
    reasonMock.mockReturnValue('expo_go');
    await renderWithProviders(<RemindersCard />);

    expect(reminderSwitch().props.disabled).toBe(true);
    expect(screen.getByText(/Expo Go cannot schedule them on Android/)).toBeTruthy();
  });
});

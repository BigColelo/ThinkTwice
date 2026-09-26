import { fireEvent, screen } from '@testing-library/react-native';

import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { resetAllLocalData } from '@/features/settings/services/dataActions';
import { renderWithProviders } from '@/test/renderWithProviders';
import { confirm } from '@/utils/confirm';

import { LocalDataCard } from './LocalDataCard';

jest.mock('@/db/DatabaseProvider', () => ({
  // The card only forwards this to the service, which is mocked below.
  useRepositories: () => ({}),
}));

jest.mock('@/features/settings/services/dataActions', () => ({
  resetAllLocalData: jest.fn(async () => undefined),
}));

jest.mock('@/utils/confirm', () => ({ confirm: jest.fn(async () => true) }));

/**
 * The one control in the app that destroys everything, so the guard in front of
 * it is asserted as carefully as the action: no confirmation, no reset — and a
 * failed reset is never allowed to look like one that worked.
 */

const resetMock = jest.mocked(resetAllLocalData);
const confirmMock = jest.mocked(confirm);

beforeEach(() => {
  jest.clearAllMocks();
  confirmMock.mockResolvedValue(true);
});

describe('LocalDataCard', () => {
  it('names the schema version the data is stored in', async () => {
    await renderWithProviders(<LocalDataCard />);

    expect(screen.getByText(new RegExp(`Schema version ${LATEST_SCHEMA_VERSION}\\.`))).toBeTruthy();
  });

  it('asks first, naming what will be lost', async () => {
    await renderWithProviders(<LocalDataCard />);

    await fireEvent.press(screen.getByText('Reset all local data'));

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete all local data?',
        confirmLabel: 'Delete everything',
        destructive: true,
      }),
    );
    expect(resetMock).toHaveBeenCalledTimes(1);
  });

  it('deletes nothing when the user backs out', async () => {
    confirmMock.mockResolvedValueOnce(false);
    await renderWithProviders(<LocalDataCard />);

    await fireEvent.press(screen.getByText('Reset all local data'));

    expect(resetMock).not.toHaveBeenCalled();
  });

  it('says so when the reset could not be completed', async () => {
    resetMock.mockRejectedValueOnce(new Error('database is locked'));
    await renderWithProviders(<LocalDataCard />);

    await fireEvent.press(screen.getByText('Reset all local data'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The reset could not be completed. Please try again.',
    );
  });
});

import { fireEvent, screen } from '@testing-library/react-native';

import { seedDevelopmentData } from '@/db/devSeed';
import { renderWithProviders } from '@/test/renderWithProviders';

import { DevelopmentCard } from './DevelopmentCard';

jest.mock('@/db/DatabaseProvider', () => ({
  // The card only forwards this to the seed, which is mocked below.
  useRepositories: () => ({}),
}));

jest.mock('@/db/devSeed', () => ({
  seedDevelopmentData: jest.fn(async () => undefined),
}));

/**
 * Development only, but still a write: the caller moves on only once the sample
 * data is really there, and a seed that failed says so rather than leaving the
 * developer on an unchanged screen.
 */

const seedMock = jest.mocked(seedDevelopmentData);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DevelopmentCard', () => {
  it('loads the sample data, then hands over', async () => {
    const onSeeded = jest.fn();
    await renderWithProviders(<DevelopmentCard onSeeded={onSeeded} />);

    await fireEvent.press(screen.getByText('Load sample data'));

    expect(seedMock).toHaveBeenCalledTimes(1);
    expect(onSeeded).toHaveBeenCalledTimes(1);
  });

  it('stays put and says so when the seed fails', async () => {
    seedMock.mockRejectedValueOnce(new Error('UNIQUE constraint failed'));
    const onSeeded = jest.fn();
    await renderWithProviders(<DevelopmentCard onSeeded={onSeeded} />);

    await fireEvent.press(screen.getByText('Load sample data'));

    expect(onSeeded).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });
});

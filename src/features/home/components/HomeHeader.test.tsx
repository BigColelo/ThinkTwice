import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { HomeHeader } from './HomeHeader';

/** The way into Settings from Home is an icon, so it has to be named for a screen reader. */

describe('HomeHeader', () => {
  it('greets the user and opens Settings by name', async () => {
    const onOpenSettings = jest.fn();
    await renderWithProviders(<HomeHeader onOpenSettings={onOpenSettings} />);

    expect(screen.getByText('Here’s your overview')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Settings'));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});

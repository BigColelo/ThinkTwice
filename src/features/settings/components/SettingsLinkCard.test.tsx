import { fireEvent, screen } from '@testing-library/react-native';
import { Globe } from 'lucide-react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { SettingsLinkCard } from './SettingsLinkCard';

/** A row that leads elsewhere has to say where, and what it is currently set to. */

describe('SettingsLinkCard', () => {
  it('shows the current value and opens its screen', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <SettingsLinkCard
        icon={Globe}
        tint="blue"
        title="Language"
        subtitle="Italiano"
        onPress={onPress}
      />,
    );

    expect(screen.getByText('Italiano')).toBeTruthy();

    await fireEvent.press(screen.getByText('Language'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

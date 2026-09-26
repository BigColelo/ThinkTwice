import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { RecentEntry } from '../recentEntries';
import { AddChoices } from './AddChoices';
import { RecentEntryList } from './RecentEntryList';

/**
 * The add flow asks one question. Both answers must lead where they say, and a
 * recent shortcut must say which half of the app it belongs to — in words, and
 * to a screen reader.
 */

describe('AddChoices', () => {
  it('asks the question and leads each answer to its own form', async () => {
    const onWantToBuy = jest.fn();
    const onAlreadyOwn = jest.fn();
    await renderWithProviders(<AddChoices onWantToBuy={onWantToBuy} onAlreadyOwn={onAlreadyOwn} />);

    expect(screen.getByText('What are you adding?')).toBeTruthy();

    await fireEvent.press(screen.getByText('Something I want to buy'));
    await fireEvent.press(screen.getByText('Something I already own'));

    expect(onWantToBuy).toHaveBeenCalledTimes(1);
    expect(onAlreadyOwn).toHaveBeenCalledTimes(1);
  });
});

describe('RecentEntryList', () => {
  const entry: RecentEntry = {
    key: 'w-w1',
    kind: 'thinking',
    name: 'Camera',
    cents: 179_900,
    categoryId: 'photography',
    imageUri: null,
    href: '/wishlist/w1',
  };

  it('names each entry, its half of the app and its price', async () => {
    await renderWithProviders(
      <RecentEntryList
        entries={[
          entry,
          { ...entry, key: 'p-p1', kind: 'owned', name: 'Tent', href: '/purchase/p1' },
        ]}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Camera, Thinking about')).toBeTruthy();
    expect(screen.getByLabelText('Tent, Owned')).toBeTruthy();
    expect(screen.getAllByText('EUR 1,799')).toHaveLength(2);
  });

  it('hands the entry tapped back to the caller', async () => {
    const onSelect = jest.fn();
    await renderWithProviders(<RecentEntryList entries={[entry]} onSelect={onSelect} />);

    await fireEvent.press(screen.getByText('Camera'));

    expect(onSelect).toHaveBeenCalledWith(entry);
  });
});

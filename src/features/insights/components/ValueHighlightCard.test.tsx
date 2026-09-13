import { screen, fireEvent } from '@testing-library/react-native';

import type { ValueHighlight } from '@/domain';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ValueHighlightCard } from './ValueHighlightCard';

/**
 * One end of the cost-per-use range.
 *
 * The figure is a rate rather than a price, so it always carries two decimals
 * and its unit — `EUR 2.77 / use` says something `EUR 3` does not. And the card
 * has to name which end it is in words: the arrow and the colour are a repeat of
 * the label, never the only place it is said.
 */

function highlight(overrides: Partial<ValueHighlight> = {}): ValueHighlight {
  return {
    purchaseId: 'p1',
    name: 'Running shoes',
    categoryId: 'sport',
    imageUri: null,
    costPerUseCents: 86.09,
    totalUses: 151,
    ...overrides,
  };
}

describe('ValueHighlightCard', () => {
  it('prints the rate with its unit and two decimals', async () => {
    await renderWithProviders(
      <ValueHighlightCard
        label="Lowest cost per use"
        highlight={highlight()}
        tone="positive"
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText(/EUR\s0\.86 \/ use/)).toBeTruthy();
    expect(screen.getByText('151 uses')).toBeTruthy();
  });

  it('says which end it is in words, not only in colour', async () => {
    await renderWithProviders(
      <ValueHighlightCard
        label="Highest cost per use"
        highlight={highlight({ costPerUseCents: 1_826 })}
        tone="warning"
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Highest cost per use')).toBeTruthy();
    expect(screen.getByLabelText('Highest cost per use: Running shoes')).toBeTruthy();
  });

  it('opens the purchase it is about', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <ValueHighlightCard
        label="Lowest cost per use"
        highlight={highlight()}
        tone="positive"
        onPress={onPress}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Lowest cost per use: Running shoes'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

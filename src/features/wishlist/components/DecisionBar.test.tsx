import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { DecisionBar } from './DecisionBar';

/**
 * The two answers to a reflection. Both must always be reachable, and neither
 * may be taken while the other is being saved.
 */

describe('DecisionBar', () => {
  it('offers both answers', async () => {
    const onDismiss = jest.fn();
    const onBought = jest.fn();
    await renderWithProviders(
      <DecisionBar onDismiss={onDismiss} onBought={onBought} isDismissing={false} />,
    );

    await fireEvent.press(screen.getByText("I don't want it anymore"));
    await fireEvent.press(screen.getByText('I bought it'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onBought).toHaveBeenCalledTimes(1);
  });

  it('holds "I bought it" while a dismissal is being saved', async () => {
    const onBought = jest.fn();
    await renderWithProviders(
      <DecisionBar onDismiss={jest.fn()} onBought={onBought} isDismissing />,
    );

    await fireEvent.press(screen.getByText('I bought it'));

    expect(onBought).not.toHaveBeenCalled();
  });
});

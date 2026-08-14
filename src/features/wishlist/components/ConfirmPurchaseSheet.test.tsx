import { screen, fireEvent } from '@testing-library/react-native';

import type { ConvertToPurchaseOptions } from '@/features/wishlist/services/wishlistActions';
import { renderWithProviders } from '@/test/renderWithProviders';
import { todayIsoDate } from '@/utils/dates';

import { ConfirmPurchaseSheet } from './ConfirmPurchaseSheet';

/**
 * Confirming a purchase.
 *
 * The point of this sheet is that the price and the date are the user's answer,
 * not the app's assumption — so what is asserted here is that both are prefilled
 * with something sensible and that a correction actually reaches the caller.
 */

const ITEM = { name: 'Camera', priceCents: 179_900 };

describe('ConfirmPurchaseSheet', () => {
  it('prefills what was paid with the price under consideration', async () => {
    await renderWithProviders(
      <ConfirmPurchaseSheet item={ITEM} visible onClose={jest.fn()} onConfirm={jest.fn()} />,
    );

    expect(screen.getByDisplayValue('1799')).toBeTruthy();
    // The date defaults to today, which is what "I bought it" means most of the time.
    expect(screen.getByLabelText(/^When did you buy it\?:/)).toBeTruthy();
  });

  it('confirms with the prefilled values in one tap', async () => {
    const onConfirm = jest.fn(async (_options: Required<ConvertToPurchaseOptions>) => undefined);
    await renderWithProviders(
      <ConfirmPurchaseSheet item={ITEM} visible onClose={jest.fn()} onConfirm={onConfirm} />,
    );

    await fireEvent.press(screen.getByText('I bought it'));

    expect(onConfirm).toHaveBeenCalledWith({
      actualPriceCents: 179_900,
      purchaseDate: todayIsoDate(),
    });
  });

  it('sends the corrected price when the user paid something else', async () => {
    const onConfirm = jest.fn(async (_options: Required<ConvertToPurchaseOptions>) => undefined);
    await renderWithProviders(
      <ConfirmPurchaseSheet item={ITEM} visible onClose={jest.fn()} onConfirm={onConfirm} />,
    );

    // Found it cheaper than the price that was being reflected on.
    await fireEvent.changeText(screen.getByLabelText('What you paid'), '1599');
    await fireEvent.press(screen.getByText('I bought it'));

    expect(onConfirm.mock.calls[0]?.[0]).toMatchObject({ actualPriceCents: 159_900 });
  });

  it('accepts a free item rather than insisting on the estimated price', async () => {
    const onConfirm = jest.fn(async (_options: Required<ConvertToPurchaseOptions>) => undefined);
    await renderWithProviders(
      <ConfirmPurchaseSheet item={ITEM} visible onClose={jest.fn()} onConfirm={onConfirm} />,
    );

    // A gift is a real way to end up owning something, and its cost per use is
    // still made of the expenses that follow.
    await fireEvent.changeText(screen.getByLabelText('What you paid'), '0');
    await fireEvent.press(screen.getByText('I bought it'));

    expect(onConfirm.mock.calls[0]?.[0]).toMatchObject({ actualPriceCents: 0 });
  });

  it('keeps the sheet open and explains itself when saving fails', async () => {
    const onConfirm = jest.fn(async () => {
      throw new Error('write failed');
    });
    await renderWithProviders(
      <ConfirmPurchaseSheet item={ITEM} visible onClose={jest.fn()} onConfirm={onConfirm} />,
    );

    await fireEvent.press(screen.getByText('I bought it'));

    expect(screen.getByText('This could not be saved. Please try again.')).toBeTruthy();
    expect(screen.getByDisplayValue('1799')).toBeTruthy();
  });

  it('closes without recording anything when cancelled', async () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    await renderWithProviders(
      <ConfirmPurchaseSheet item={ITEM} visible onClose={onClose} onConfirm={onConfirm} />,
    );

    await fireEvent.press(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('says what will happen, without approving of it', async () => {
    await renderWithProviders(
      <ConfirmPurchaseSheet item={ITEM} visible onClose={jest.fn()} onConfirm={jest.fn()} />,
    );

    expect(screen.getByText(/moves to your purchases/)).toBeTruthy();
    for (const phrase of [/congratulations/i, /enjoy/i, /treat yourself/i, /afford/i]) {
      expect(screen.queryByText(phrase)).toBeNull();
    }
  });
});

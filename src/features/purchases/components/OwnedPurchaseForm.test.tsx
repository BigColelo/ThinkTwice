import { screen, fireEvent } from '@testing-library/react-native';

import type { NewPurchase } from '@/db/repositories';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Purchase } from '@/types/domain';
import { todayIsoDate } from '@/utils/dates';

import { OwnedPurchaseForm } from './OwnedPurchaseForm';

jest.mock('@/features/images/itemImages', () => ({
  deleteItemImage: jest.fn(async () => undefined),
  persistItemImage: jest.fn(async (uri: string | null) => uri),
  pickItemImage: jest.fn(async () => ({ status: 'cancelled' })),
}));

/**
 * The shared add/edit form for something already owned.
 *
 * Two things are worth holding in place: a price of zero is accepted here (a gift
 * is a real way to own something, unlike a wishlist item with no price typed), and
 * an edit sends every field back — including the optional expectation — so saving
 * a correction cannot quietly drop what it did not touch.
 */

function purchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 'p1',
    wishlistItemId: null,
    name: 'Espresso machine',
    purchasePriceCents: 65_000,
    purchaseDate: '2026-08-13',
    categoryId: 'home',
    imageUri: null,
    expectedUsageFrequency: 'daily',
    customUsesPerMonth: null,
    expectedOwnershipMonths: 60,
    currentResaleValueCents: 20_000,
    createdAt: '2026-08-13T09:00:00.000Z',
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  };
}

describe('OwnedPurchaseForm, adding', () => {
  it('starts on today, since that is when most purchases are recorded', async () => {
    await renderWithProviders(
      <OwnedPurchaseForm submitLabel="Add purchase" onSubmit={jest.fn()} />,
    );

    expect(screen.getByLabelText(/^Purchase date:/)).toBeTruthy();
  });

  it('refuses to save without a name', async () => {
    const onSubmit = jest.fn(async (_values: NewPurchase) => undefined);
    await renderWithProviders(<OwnedPurchaseForm submitLabel="Add purchase" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByText('Add purchase'));

    expect(screen.getByText('Give this item a name.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('accepts a price of zero, because a gift is a real way to own something', async () => {
    const onSubmit = jest.fn(async (_values: NewPurchase) => undefined);
    await renderWithProviders(<OwnedPurchaseForm submitLabel="Add purchase" onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Hand-me-down kettle');
    await fireEvent.press(screen.getByText('Add purchase'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      name: 'Hand-me-down kettle',
      purchasePriceCents: 0,
      purchaseDate: todayIsoDate(),
      // Nothing was said about the expectation, so nothing is recorded.
      expectedUsageFrequency: null,
      expectedOwnershipMonths: null,
    });
  });
});

describe('OwnedPurchaseForm, editing', () => {
  it('prefills the fields from the purchase', async () => {
    await renderWithProviders(
      <OwnedPurchaseForm purchase={purchase()} submitLabel="Save changes" onSubmit={jest.fn()} />,
    );

    expect(screen.getByDisplayValue('Espresso machine')).toBeTruthy();
    expect(screen.getByDisplayValue('650')).toBeTruthy();
    expect(screen.getByDisplayValue('200')).toBeTruthy();
    expect(screen.getByLabelText(/^Purchase date: 13 Aug 2026/)).toBeTruthy();
  });

  it('sends every field back, not only the one that changed', async () => {
    const onSubmit = jest.fn(async (_values: NewPurchase) => undefined);
    await renderWithProviders(
      <OwnedPurchaseForm purchase={purchase()} submitLabel="Save changes" onSubmit={onSubmit} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Purchase price'), '599');
    await fireEvent.press(screen.getByText('Save changes'));

    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: 'Espresso machine',
      purchasePriceCents: 59_900,
      purchaseDate: '2026-08-13',
      categoryId: 'home',
      imageUri: null,
      currentResaleValueCents: 20_000,
      expectedUsageFrequency: 'daily',
      customUsesPerMonth: null,
      expectedOwnershipMonths: 60,
    });
  });

  it('shows its own error when saving fails, and stays on the form', async () => {
    const onSubmit = jest.fn(async () => {
      throw new Error('write failed');
    });
    await renderWithProviders(
      <OwnedPurchaseForm purchase={purchase()} submitLabel="Save changes" onSubmit={onSubmit} />,
    );

    await fireEvent.press(screen.getByText('Save changes'));

    expect(screen.getByText('This purchase could not be saved. Please try again.')).toBeTruthy();
    expect(screen.getByDisplayValue('Espresso machine')).toBeTruthy();
  });
});

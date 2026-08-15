import { screen, fireEvent } from '@testing-library/react-native';

import type { MonthlyFinances } from '@/domain';
import type { CreateWishlistItemInput } from '@/features/wishlist/services/wishlistActions';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { WishlistItem } from '@/types/domain';

import { WishlistItemForm } from './WishlistItemForm';

jest.mock('@/features/images/itemImages', () => ({
  deleteItemImage: jest.fn(async () => undefined),
  persistItemImage: jest.fn(async (uri: string | null) => uri),
  pickItemImage: jest.fn(async () => ({ status: 'cancelled' })),
}));

/**
 * The shared add/edit form.
 *
 * Two things are worth holding in place here. A price the user never typed must
 * not become a €0 item, and an edit must send the stored reflection period back
 * unchanged — the update service reads "the user chose this period" from exactly
 * that comparison, so a form that silently altered it would move a countdown
 * nobody asked to move.
 */

const FINANCES: MonthlyFinances = {
  netIncomeCents: 165_000,
  commitmentsCents: 78_300,
  savingsTargetCents: null,
  availableAfterCommitmentsCents: 86_700,
  availableAfterSavingsGoalCents: null,
  availableToIncomeRatio: 86_700 / 165_000,
  commitmentsToIncomeRatio: 78_300 / 165_000,
  isIncomeConfigured: true,
  commitmentsExceedIncome: false,
};

function item(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: 'w1',
    name: 'Camera',
    priceCents: 179_900,
    categoryId: 'photography',
    imageUri: null,
    expectedUsageFrequency: 'several_times_week',
    customUsesPerMonth: null,
    expectedOwnershipMonths: 60,
    // 30 days is what €1,799 is suggested with this financial picture.
    cooldownDays: 30,
    cooldownStartedAt: '2026-08-06T09:00:00.000Z',
    cooldownEndsAt: '2026-09-05T09:00:00.000Z',
    status: 'thinking',
    notes: 'Compare with the second-hand price.',
    decidedAt: null,
    createdAt: '2026-08-06T09:00:00.000Z',
    updatedAt: '2026-08-06T09:00:00.000Z',
    ...overrides,
  };
}

describe('WishlistItemForm, adding', () => {
  it('starts with an empty price rather than a zero the user did not type', async () => {
    await renderWithProviders(
      <WishlistItemForm finances={FINANCES} submitLabel="Start thinking" onSubmit={jest.fn()} />,
    );

    expect(screen.queryByDisplayValue('0')).toBeNull();
  });

  it('refuses to save without a name and a price', async () => {
    const onSubmit = jest.fn(async (_values: CreateWishlistItemInput) => undefined);
    await renderWithProviders(
      <WishlistItemForm finances={FINANCES} submitLabel="Start thinking" onSubmit={onSubmit} />,
    );

    await fireEvent.press(screen.getByText('Start thinking'));

    expect(screen.getByText('Give this item a name.')).toBeTruthy();
    // An empty field is a missing price, not a price of zero.
    expect(screen.getByText('Enter a price.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits integer cents and the period suggested for the price', async () => {
    const onSubmit = jest.fn(async (_values: CreateWishlistItemInput) => undefined);
    await renderWithProviders(
      <WishlistItemForm finances={FINANCES} submitLabel="Start thinking" onSubmit={onSubmit} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Camera');
    await fireEvent.changeText(screen.getByLabelText('Price'), '1799');
    await fireEvent.press(screen.getByText('Start thinking'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      name: 'Camera',
      priceCents: 179_900,
      // €1,799 against €867 available is more than a month of it: 30 days.
      cooldownDays: 30,
    });
  });
});

describe('WishlistItemForm, editing', () => {
  it('prefills every field from the item', async () => {
    await renderWithProviders(
      <WishlistItemForm
        finances={FINANCES}
        item={item()}
        submitLabel="Save changes"
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Camera')).toBeTruthy();
    expect(screen.getByDisplayValue('1799')).toBeTruthy();
    expect(screen.getByDisplayValue('Compare with the second-hand price.')).toBeTruthy();
  });

  it('sends the stored period back unchanged when it is not touched', async () => {
    const onSubmit = jest.fn(async (_values: CreateWishlistItemInput) => undefined);
    await renderWithProviders(
      <WishlistItemForm
        finances={FINANCES}
        // A period the user chose themselves: nothing here may quietly replace it.
        item={item({ cooldownDays: 3 })}
        submitLabel="Save changes"
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByText('Save changes'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ cooldownDays: 3 });
  });

  it('explains that the period is counted from when the reflection began', async () => {
    await renderWithProviders(
      <WishlistItemForm
        finances={FINANCES}
        item={item()}
        submitLabel="Save changes"
        onSubmit={jest.fn()}
      />,
    );

    expect(
      screen.getByText('Counted from when this reflection period started, not from today.'),
    ).toBeTruthy();
  });

  it('shows its own error when saving fails, and stays on the form', async () => {
    const onSubmit = jest.fn(async () => {
      throw new Error('write failed');
    });
    await renderWithProviders(
      <WishlistItemForm
        finances={FINANCES}
        item={item()}
        submitLabel="Save changes"
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByText('Save changes'));

    expect(screen.getByText('This item could not be saved. Please try again.')).toBeTruthy();
    expect(screen.getByDisplayValue('Camera')).toBeTruthy();
  });
});

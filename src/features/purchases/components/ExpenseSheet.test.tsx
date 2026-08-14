import { screen, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { PurchaseExpense } from '@/types/domain';
import { todayIsoDate } from '@/utils/dates';

import type { PurchaseExpenseFormValues } from '../schemas/purchaseSchema';

import { ExpenseSheet } from './ExpenseSheet';

/**
 * Adding and correcting money spent after buying.
 *
 * These amounts feed the real cost, so the sheet has to be able to fix one as
 * well as add one — and removing is offered here, inside the thing you opened,
 * rather than by tapping a row that looks openable.
 */

const expense: PurchaseExpense = {
  id: 'e1',
  purchaseId: 'p1',
  name: 'Descaler',
  amountCents: 1_200,
  expenseType: 'maintenance',
  date: '2026-08-13',
  createdAt: '2026-08-13T09:00:00.000Z',
};

const submitted = (): jest.Mock<Promise<void>, [PurchaseExpenseFormValues]> =>
  jest.fn(async (_values: PurchaseExpenseFormValues) => undefined);

describe('ExpenseSheet, adding', () => {
  it('opens empty, on today, ready for the first field', async () => {
    await renderWithProviders(<ExpenseSheet visible onClose={jest.fn()} onSubmit={submitted()} />);

    expect(screen.getByText('New expense')).toBeTruthy();
    expect(screen.getByLabelText(/^Date: /)).toBeTruthy();
    // Removing is not offered for something that does not exist yet.
    expect(screen.queryByText('Remove expense')).toBeNull();
  });

  it('refuses to save without a name', async () => {
    const onSubmit = submitted();
    await renderWithProviders(<ExpenseSheet visible onClose={jest.fn()} onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByText('Add expense'));

    expect(screen.getByText('Give this expense a name.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hands over what was typed', async () => {
    const onSubmit = submitted();
    await renderWithProviders(<ExpenseSheet visible onClose={jest.fn()} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('What was it?'), 'Extra battery');
    await fireEvent.changeText(screen.getByLabelText('Amount'), '49.90');
    await fireEvent.press(screen.getByText('Add expense'));

    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: 'Extra battery',
      amountCents: 4_990,
      expenseType: 'accessory',
      date: todayIsoDate(),
    });
  });
});

describe('ExpenseSheet, correcting', () => {
  it('opens prefilled and says what it is doing', async () => {
    await renderWithProviders(
      <ExpenseSheet expense={expense} visible onClose={jest.fn()} onSubmit={submitted()} />,
    );

    expect(screen.getByText('Edit expense')).toBeTruthy();
    expect(screen.getByDisplayValue('Descaler')).toBeTruthy();
    expect(screen.getByDisplayValue('12')).toBeTruthy();
    expect(screen.getByLabelText(/^Date: 13 Aug 2026/)).toBeTruthy();
  });

  it('sends the whole expense back with the correction applied', async () => {
    const onSubmit = submitted();
    await renderWithProviders(
      <ExpenseSheet expense={expense} visible onClose={jest.fn()} onSubmit={onSubmit} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Amount'), '14.50');
    await fireEvent.press(screen.getByText('Save changes'));

    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: 'Descaler',
      amountCents: 1_450,
      expenseType: 'maintenance',
      date: '2026-08-13',
    });
  });

  it('offers removal, and leaves the decision to the caller', async () => {
    const onDelete = jest.fn(async () => undefined);
    await renderWithProviders(
      <ExpenseSheet
        expense={expense}
        visible
        onClose={jest.fn()}
        onSubmit={submitted()}
        onDelete={onDelete}
      />,
    );

    await fireEvent.press(screen.getByText('Remove expense'));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('stays open and explains itself when saving fails', async () => {
    const onSubmit = jest.fn(async () => {
      throw new Error('write failed');
    });
    await renderWithProviders(
      <ExpenseSheet expense={expense} visible onClose={jest.fn()} onSubmit={onSubmit} />,
    );

    await fireEvent.press(screen.getByText('Save changes'));

    expect(screen.getByText('This expense could not be saved. Please try again.')).toBeTruthy();
    expect(screen.getByDisplayValue('Descaler')).toBeTruthy();
  });

  it('closes without saving when cancelled', async () => {
    const onClose = jest.fn();
    const onSubmit = submitted();
    await renderWithProviders(
      <ExpenseSheet expense={expense} visible onClose={onClose} onSubmit={onSubmit} />,
    );

    await fireEvent.press(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

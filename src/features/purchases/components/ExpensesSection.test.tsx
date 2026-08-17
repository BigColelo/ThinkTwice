import { screen, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { PurchaseExpense } from '@/types/domain';

import { ExpensesSection } from './ExpensesSection';

/**
 * The list of what was spent after buying.
 *
 * With nothing recorded it explains what belongs here rather than disappearing,
 * and a row opens the expense instead of destroying it — the two decisions this
 * section exists to hold.
 */

function expense(overrides: Partial<PurchaseExpense> = {}): PurchaseExpense {
  return {
    id: 'e1',
    purchaseId: 'p1',
    name: 'Descaler',
    amountCents: 1_200,
    expenseType: 'maintenance',
    date: '2026-08-13',
    createdAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  };
}

describe('ExpensesSection', () => {
  it('lists what was spent, with type and date', async () => {
    await renderWithProviders(<ExpensesSection expenses={[expense()]} onSelect={jest.fn()} />);

    expect(screen.getByText('Descaler')).toBeTruthy();
    expect(screen.getByText('Maintenance · 13 Aug 2026')).toBeTruthy();
    expect(screen.getByText('EUR 12')).toBeTruthy();
    expect(screen.getByText('1 recorded')).toBeTruthy();
  });

  it('explains what belongs here when nothing has been spent', async () => {
    await renderWithProviders(<ExpensesSection expenses={[]} onSelect={jest.fn()} />);

    expect(screen.getByText('Nothing spent on this yet')).toBeTruthy();
    expect(screen.getByText(/keeps the cost per use honest/)).toBeTruthy();
    // No count to report, so the header does not invent one.
    expect(screen.queryByText(/recorded/)).toBeNull();
  });

  it('opens an expense rather than deleting it when a row is tapped', async () => {
    const onSelect = jest.fn();
    const descaler = expense();
    await renderWithProviders(<ExpensesSection expenses={[descaler]} onSelect={onSelect} />);

    await fireEvent.press(screen.getByText('Descaler'));

    expect(onSelect).toHaveBeenCalledWith(descaler);
  });

  it('keeps every expense on its own row', async () => {
    await renderWithProviders(
      <ExpensesSection
        expenses={[expense(), expense({ id: 'e2', name: 'New grinder', expenseType: 'upgrade' })]}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText('2 recorded')).toBeTruthy();
    expect(screen.getByText('Descaler')).toBeTruthy();
    expect(screen.getByText('New grinder')).toBeTruthy();
  });
});

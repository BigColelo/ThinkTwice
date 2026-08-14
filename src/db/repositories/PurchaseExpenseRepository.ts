import type { SQLiteDatabase } from 'expo-sqlite';

import type { Cents, ExpenseType, PurchaseExpense } from '@/types/domain';
import { nowIso, todayIsoDate } from '@/utils/dates';
import { createId } from '@/utils/ids';

import { mapPurchaseExpense, type PurchaseExpenseRow } from '../mappers';

export type NewPurchaseExpense = {
  purchaseId: string;
  name: string;
  amountCents: Cents;
  expenseType: ExpenseType;
  date?: string;
};

/** Which purchase an expense belongs to is not editable: that would be a new expense. */
export type PurchaseExpenseUpdate = Partial<Omit<NewPurchaseExpense, 'purchaseId'>>;

const SELECT = `SELECT id, purchase_id, name, amount_cents, expense_type, date, created_at
                  FROM purchase_expenses`;

export class PurchaseExpenseRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listForPurchase(purchaseId: string): Promise<PurchaseExpense[]> {
    const rows = await this.db.getAllAsync<PurchaseExpenseRow>(
      `${SELECT} WHERE purchase_id = ? ORDER BY date DESC, created_at DESC`,
      purchaseId,
    );
    return rows.map(mapPurchaseExpense);
  }

  async findById(id: string): Promise<PurchaseExpense | null> {
    const row = await this.db.getFirstAsync<PurchaseExpenseRow>(`${SELECT} WHERE id = ?`, id);
    return row ? mapPurchaseExpense(row) : null;
  }

  async create(input: NewPurchaseExpense): Promise<PurchaseExpense> {
    const id = createId();
    const now = nowIso();

    await this.db.runAsync(
      `INSERT INTO purchase_expenses (id, purchase_id, name, amount_cents, expense_type, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.purchaseId,
      input.name.trim(),
      Math.round(input.amountCents),
      input.expenseType,
      input.date ?? todayIsoDate(),
      now,
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Expense could not be created.');
    return created;
  }

  async update(id: string, update: PurchaseExpenseUpdate): Promise<PurchaseExpense | null> {
    const assignments: string[] = [];
    const values: (string | number)[] = [];

    const set = (column: string, value: string | number): void => {
      assignments.push(`${column} = ?`);
      values.push(value);
    };

    if (update.name !== undefined) set('name', update.name.trim());
    if (update.amountCents !== undefined) set('amount_cents', Math.round(update.amountCents));
    if (update.expenseType !== undefined) set('expense_type', update.expenseType);
    if (update.date !== undefined) set('date', update.date);

    if (assignments.length === 0) return this.findById(id);

    await this.db.runAsync(
      `UPDATE purchase_expenses SET ${assignments.join(', ')} WHERE id = ?`,
      ...values,
      id,
    );

    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM purchase_expenses WHERE id = ?', id);
  }
}

import type { SQLiteDatabase } from 'expo-sqlite';

import type { RecurringCommitment } from '@/types/domain';
import { nowIso } from '@/utils/dates';
import { createId } from '@/utils/ids';

import { fromBoolean, mapRecurringCommitment, type RecurringCommitmentRow } from '../mappers';

export type NewRecurringCommitment = Pick<
  RecurringCommitment,
  'name' | 'amountCents' | 'frequency' | 'categoryId'
> & { isActive?: boolean };

export type RecurringCommitmentUpdate = Partial<NewRecurringCommitment>;

const SELECT = `SELECT id, name, amount_cents, frequency, category_id, is_active, created_at, updated_at
                  FROM recurring_commitments`;

export class RecurringCommitmentRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  /** Active commitments, largest first — the order the Money screen displays. */
  async listActive(): Promise<RecurringCommitment[]> {
    const rows = await this.db.getAllAsync<RecurringCommitmentRow>(
      `${SELECT} WHERE is_active = 1 ORDER BY amount_cents DESC, name COLLATE NOCASE ASC`,
    );
    return rows.map(mapRecurringCommitment);
  }

  async listAll(): Promise<RecurringCommitment[]> {
    const rows = await this.db.getAllAsync<RecurringCommitmentRow>(
      `${SELECT} ORDER BY is_active DESC, amount_cents DESC, name COLLATE NOCASE ASC`,
    );
    return rows.map(mapRecurringCommitment);
  }

  async findById(id: string): Promise<RecurringCommitment | null> {
    const row = await this.db.getFirstAsync<RecurringCommitmentRow>(`${SELECT} WHERE id = ?`, id);
    return row ? mapRecurringCommitment(row) : null;
  }

  async create(input: NewRecurringCommitment): Promise<RecurringCommitment> {
    const id = createId();
    const now = nowIso();

    await this.db.runAsync(
      `INSERT INTO recurring_commitments
         (id, name, amount_cents, frequency, category_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.name.trim(),
      Math.round(input.amountCents),
      input.frequency,
      input.categoryId,
      fromBoolean(input.isActive ?? true),
      now,
      now,
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Commitment could not be created.');
    return created;
  }

  async update(id: string, update: RecurringCommitmentUpdate): Promise<RecurringCommitment | null> {
    const assignments: string[] = [];
    const values: (string | number)[] = [];

    if (update.name !== undefined) {
      assignments.push('name = ?');
      values.push(update.name.trim());
    }
    if (update.amountCents !== undefined) {
      assignments.push('amount_cents = ?');
      values.push(Math.round(update.amountCents));
    }
    if (update.frequency !== undefined) {
      assignments.push('frequency = ?');
      values.push(update.frequency);
    }
    if (update.categoryId !== undefined) {
      assignments.push('category_id = ?');
      values.push(update.categoryId);
    }
    if (update.isActive !== undefined) {
      assignments.push('is_active = ?');
      values.push(fromBoolean(update.isActive));
    }

    if (assignments.length === 0) return this.findById(id);

    assignments.push('updated_at = ?');
    values.push(nowIso());

    await this.db.runAsync(
      `UPDATE recurring_commitments SET ${assignments.join(', ')} WHERE id = ?`,
      ...values,
      id,
    );

    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM recurring_commitments WHERE id = ?', id);
  }
}

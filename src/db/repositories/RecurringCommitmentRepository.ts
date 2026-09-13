import type { SQLiteDatabase } from 'expo-sqlite';

import type { RecurringCommitment } from '@/types/domain';
import { nowIso } from '@/utils/dates';
import { createId } from '@/utils/ids';

import { fromBoolean, mapRecurringCommitment, type RecurringCommitmentRow } from '../mappers';
import { roundedOrSkip, UpdateColumns } from './updateColumns';

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

  /**
   * Everything, paused commitments included, active ones first. The Money screen
   * needs the paused ones to be visible — a commitment that vanished when it was
   * paused could never be brought back.
   */
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
    const columns = new UpdateColumns()
      .set('name', update.name?.trim())
      .set('amount_cents', roundedOrSkip(update.amountCents))
      .set('frequency', update.frequency)
      .set('category_id', update.categoryId)
      // Pausing is an update like any other: the row stays and stops counting.
      .set('is_active', update.isActive === undefined ? undefined : fromBoolean(update.isActive));

    if (columns.isEmpty) return this.findById(id);

    columns.set('updated_at', nowIso());
    await columns.update(this.db, 'recurring_commitments', id);

    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM recurring_commitments WHERE id = ?', id);
  }
}

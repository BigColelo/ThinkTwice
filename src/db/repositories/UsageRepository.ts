import type { SQLiteDatabase } from 'expo-sqlite';

import type { IsoTimestamp, UsageEvent } from '@/types/domain';
import { nowIso } from '@/utils/dates';
import { createId } from '@/utils/ids';

import { mapUsageEvent, type UsageEventRow } from '../mappers';

const SELECT = `SELECT id, purchase_id, occurred_at, count, created_at FROM usage_events`;

export class UsageRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  /**
   * Records one use. This is the app's most-repeated write, so it stays a
   * single insert with no read-modify-write cycle.
   */
  async recordUse(
    purchaseId: string,
    occurredAt: IsoTimestamp = nowIso(),
    count = 1,
  ): Promise<UsageEvent> {
    const id = createId();
    const now = nowIso();
    const safeCount = Number.isFinite(count) && count > 0 ? Math.round(count) : 1;

    await this.db.runAsync(
      `INSERT INTO usage_events (id, purchase_id, occurred_at, count, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      purchaseId,
      occurredAt,
      safeCount,
      now,
    );

    return { id, purchaseId, occurredAt, count: safeCount, createdAt: now };
  }

  /**
   * Removes the most recently *recorded* use — the undo for an accidental tap.
   * Ordered by `created_at` (when it was entered) rather than `occurred_at`, so
   * undo always removes what the user just added.
   */
  async undoLastUse(purchaseId: string): Promise<UsageEvent | null> {
    const row = await this.db.getFirstAsync<UsageEventRow>(
      `${SELECT} WHERE purchase_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
      purchaseId,
    );
    if (!row) return null;

    await this.db.runAsync('DELETE FROM usage_events WHERE id = ?', row.id);
    return mapUsageEvent(row);
  }

  async listForPurchase(purchaseId: string, limit = 50): Promise<UsageEvent[]> {
    const rows = await this.db.getAllAsync<UsageEventRow>(
      `${SELECT} WHERE purchase_id = ? ORDER BY occurred_at DESC LIMIT ?`,
      purchaseId,
      limit,
    );
    return rows.map(mapUsageEvent);
  }

  async remove(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM usage_events WHERE id = ?', id);
  }
}

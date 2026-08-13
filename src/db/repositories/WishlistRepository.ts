import type { SQLiteDatabase } from 'expo-sqlite';

import type { IsoTimestamp, WishlistItem, WishlistStatus } from '@/types/domain';
import { nowIso } from '@/utils/dates';
import { createId } from '@/utils/ids';

import { mapWishlistItem, serializeReasonTags, type WishlistItemRow } from '../mappers';

export type NewWishlistItem = Pick<
  WishlistItem,
  | 'name'
  | 'priceCents'
  | 'categoryId'
  | 'imageUri'
  | 'expectedUsageFrequency'
  | 'customUsesPerMonth'
  | 'expectedOwnershipMonths'
  | 'cooldownDays'
  | 'cooldownStartedAt'
  | 'cooldownEndsAt'
  | 'reasonTags'
  | 'notes'
>;

export type WishlistItemUpdate = Partial<NewWishlistItem & { status: WishlistStatus }>;

const SELECT = `SELECT id, name, price_cents, category_id, image_uri, expected_usage_frequency,
                       custom_uses_per_month, expected_ownership_months, cooldown_days,
                       cooldown_started_at, cooldown_ends_at, status, reason_tags, notes,
                       decided_at, created_at, updated_at
                  FROM wishlist_items`;

/** Items the user has not decided on yet. */
const OPEN_STATUSES = "('thinking', 'ready_to_decide')";

export class WishlistRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  /**
   * Open items, soonest-ending reflection period first.
   *
   * Note that `status` in the database can lag reality — an item stays
   * `thinking` until something writes to it. Screens resolve the live status
   * from `cooldownEndsAt` via `resolveWishlistStatus`, so the query
   * deliberately selects on the *set* of open statuses rather than on one.
   */
  async listOpen(): Promise<WishlistItem[]> {
    const rows = await this.db.getAllAsync<WishlistItemRow>(
      `${SELECT} WHERE status IN ${OPEN_STATUSES} ORDER BY cooldown_ends_at ASC`,
    );
    return rows.map(mapWishlistItem);
  }

  /** The few items the Home screen shows under "Thinking about". */
  async listOpenPreview(limit: number): Promise<WishlistItem[]> {
    const rows = await this.db.getAllAsync<WishlistItemRow>(
      `${SELECT} WHERE status IN ${OPEN_STATUSES} ORDER BY cooldown_ends_at ASC LIMIT ?`,
      limit,
    );
    return rows.map(mapWishlistItem);
  }

  async findById(id: string): Promise<WishlistItem | null> {
    const row = await this.db.getFirstAsync<WishlistItemRow>(`${SELECT} WHERE id = ?`, id);
    return row ? mapWishlistItem(row) : null;
  }

  async create(input: NewWishlistItem): Promise<WishlistItem> {
    const id = createId();
    const now = nowIso();

    await this.db.runAsync(
      `INSERT INTO wishlist_items
         (id, name, price_cents, category_id, image_uri, expected_usage_frequency,
          custom_uses_per_month, expected_ownership_months, cooldown_days,
          cooldown_started_at, cooldown_ends_at, status, reason_tags, notes,
          decided_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'thinking', ?, ?, NULL, ?, ?)`,
      id,
      input.name.trim(),
      Math.round(input.priceCents),
      input.categoryId,
      input.imageUri,
      input.expectedUsageFrequency,
      input.customUsesPerMonth,
      Math.round(input.expectedOwnershipMonths),
      Math.round(input.cooldownDays),
      input.cooldownStartedAt,
      input.cooldownEndsAt,
      serializeReasonTags(input.reasonTags),
      input.notes,
      now,
      now,
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Wishlist item could not be created.');
    return created;
  }

  async update(id: string, update: WishlistItemUpdate): Promise<WishlistItem | null> {
    const assignments: string[] = [];
    const values: (string | number | null)[] = [];

    const set = (column: string, value: string | number | null): void => {
      assignments.push(`${column} = ?`);
      values.push(value);
    };

    if (update.name !== undefined) set('name', update.name.trim());
    if (update.priceCents !== undefined) set('price_cents', Math.round(update.priceCents));
    if (update.categoryId !== undefined) set('category_id', update.categoryId);
    if (update.imageUri !== undefined) set('image_uri', update.imageUri);
    if (update.expectedUsageFrequency !== undefined)
      set('expected_usage_frequency', update.expectedUsageFrequency);
    if (update.customUsesPerMonth !== undefined)
      set('custom_uses_per_month', update.customUsesPerMonth);
    if (update.expectedOwnershipMonths !== undefined)
      set('expected_ownership_months', Math.round(update.expectedOwnershipMonths));
    if (update.cooldownDays !== undefined) set('cooldown_days', Math.round(update.cooldownDays));
    if (update.cooldownStartedAt !== undefined)
      set('cooldown_started_at', update.cooldownStartedAt);
    if (update.cooldownEndsAt !== undefined) set('cooldown_ends_at', update.cooldownEndsAt);
    if (update.reasonTags !== undefined) set('reason_tags', serializeReasonTags(update.reasonTags));
    if (update.notes !== undefined) set('notes', update.notes);
    if (update.status !== undefined) set('status', update.status);

    if (assignments.length === 0) return this.findById(id);

    set('updated_at', nowIso());

    await this.db.runAsync(
      `UPDATE wishlist_items SET ${assignments.join(', ')} WHERE id = ?`,
      ...values,
      id,
    );

    return this.findById(id);
  }

  /** Records a decision. `decidedAt` is what makes the status terminal. */
  async markDecided(
    id: string,
    status: Extract<WishlistStatus, 'purchased' | 'dismissed'>,
    decidedAt: IsoTimestamp = nowIso(),
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE wishlist_items SET status = ?, decided_at = ?, updated_at = ? WHERE id = ?`,
      status,
      decidedAt,
      nowIso(),
      id,
    );
  }

  /**
   * Persists the `thinking → ready_to_decide` transition for every item whose
   * reflection period has elapsed. Purely a convenience so lists and counts
   * agree with what the UI derives; correctness never depends on it running.
   */
  async promoteElapsedCooldowns(now: IsoTimestamp = nowIso()): Promise<number> {
    const result = await this.db.runAsync(
      `UPDATE wishlist_items
          SET status = 'ready_to_decide', updated_at = ?
        WHERE status = 'thinking' AND cooldown_ends_at <= ?`,
      nowIso(),
      now,
    );
    return result.changes;
  }

  async remove(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM wishlist_items WHERE id = ?', id);
  }
}

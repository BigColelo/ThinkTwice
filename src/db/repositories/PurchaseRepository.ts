import type { SQLiteDatabase } from 'expo-sqlite';

import type { Cents, Purchase, PurchaseWithStats } from '@/types/domain';
import { nowIso } from '@/utils/dates';
import { createId } from '@/utils/ids';

import { mapPurchaseWithStats, type PurchaseWithStatsRow } from '../mappers';

export type NewPurchase = Pick<
  Purchase,
  | 'name'
  | 'purchasePriceCents'
  | 'purchaseDate'
  | 'categoryId'
  | 'imageUri'
  | 'currentResaleValueCents'
> &
  Partial<
    Pick<
      Purchase,
      'wishlistItemId' | 'expectedUsageFrequency' | 'customUsesPerMonth' | 'expectedOwnershipMonths'
    >
  >;

export type PurchaseUpdate = Partial<NewPurchase>;

export type PurchaseSort =
  'recent' | 'most_used' | 'lowest_cost_per_use' | 'highest_cost_per_use' | 'highest_price';

export const PURCHASE_SORTS: readonly { id: PurchaseSort; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'most_used', label: 'Most used' },
  { id: 'lowest_cost_per_use', label: 'Lowest cost/use' },
  { id: 'highest_cost_per_use', label: 'Highest cost/use' },
  { id: 'highest_price', label: 'Highest price' },
];

/**
 * Usage totals and expense totals are aggregated in SQL and joined once, so a
 * list of purchases costs one query no matter how long it is.
 */
const SELECT_WITH_STATS = `
  SELECT p.id, p.wishlist_item_id, p.name, p.purchase_price_cents, p.purchase_date,
         p.category_id, p.image_uri, p.expected_usage_frequency, p.custom_uses_per_month,
         p.expected_ownership_months, p.current_resale_value_cents, p.created_at, p.updated_at,
         COALESCE(u.total_uses, 0)      AS total_uses,
         COALESCE(e.total_expenses, 0)  AS additional_expenses_cents,
         u.last_used_at                 AS last_used_at
    FROM purchases p
    LEFT JOIN (
      SELECT purchase_id, SUM(count) AS total_uses, MAX(occurred_at) AS last_used_at
        FROM usage_events GROUP BY purchase_id
    ) u ON u.purchase_id = p.id
    LEFT JOIN (
      SELECT purchase_id, SUM(amount_cents) AS total_expenses
        FROM purchase_expenses GROUP BY purchase_id
    ) e ON e.purchase_id = p.id`;

/** Real cost per use, expressed in SQL so the database can order by it. */
const COST_PER_USE_EXPRESSION = `
  CASE WHEN COALESCE(u.total_uses, 0) > 0
       THEN (p.purchase_price_cents + COALESCE(e.total_expenses, 0)
             - COALESCE(p.current_resale_value_cents, 0)) * 1.0 / u.total_uses
       ELSE NULL END`;

const ORDER_BY: Record<PurchaseSort, string> = {
  recent: 'ORDER BY p.purchase_date DESC, p.created_at DESC',
  most_used: 'ORDER BY total_uses DESC, p.purchase_date DESC',
  // Items without usage have no cost per use; they sort last in both directions
  // rather than pretending to be the cheapest or the most expensive.
  lowest_cost_per_use: `ORDER BY (${COST_PER_USE_EXPRESSION}) IS NULL, (${COST_PER_USE_EXPRESSION}) ASC`,
  highest_cost_per_use: `ORDER BY (${COST_PER_USE_EXPRESSION}) IS NULL, (${COST_PER_USE_EXPRESSION}) DESC`,
  highest_price: 'ORDER BY p.purchase_price_cents DESC',
};

export class PurchaseRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(sort: PurchaseSort = 'recent'): Promise<PurchaseWithStats[]> {
    const rows = await this.db.getAllAsync<PurchaseWithStatsRow>(
      `${SELECT_WITH_STATS} ${ORDER_BY[sort]}`,
    );
    return rows.map(mapPurchaseWithStats);
  }

  /** The short list the Home screen shows under "Recent purchases". */
  async listRecent(limit: number): Promise<PurchaseWithStats[]> {
    const rows = await this.db.getAllAsync<PurchaseWithStatsRow>(
      `${SELECT_WITH_STATS} ${ORDER_BY.recent} LIMIT ?`,
      limit,
    );
    return rows.map(mapPurchaseWithStats);
  }

  async findById(id: string): Promise<PurchaseWithStats | null> {
    const row = await this.db.getFirstAsync<PurchaseWithStatsRow>(
      `${SELECT_WITH_STATS} WHERE p.id = ?`,
      id,
    );
    return row ? mapPurchaseWithStats(row) : null;
  }

  async findByWishlistItemId(wishlistItemId: string): Promise<PurchaseWithStats | null> {
    const row = await this.db.getFirstAsync<PurchaseWithStatsRow>(
      `${SELECT_WITH_STATS} WHERE p.wishlist_item_id = ? LIMIT 1`,
      wishlistItemId,
    );
    return row ? mapPurchaseWithStats(row) : null;
  }

  async create(input: NewPurchase): Promise<PurchaseWithStats> {
    const id = createId();
    const now = nowIso();

    await this.db.runAsync(
      `INSERT INTO purchases
         (id, wishlist_item_id, name, purchase_price_cents, purchase_date, category_id, image_uri,
          expected_usage_frequency, custom_uses_per_month, expected_ownership_months,
          current_resale_value_cents, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.wishlistItemId ?? null,
      input.name.trim(),
      Math.round(input.purchasePriceCents),
      input.purchaseDate,
      input.categoryId,
      input.imageUri,
      input.expectedUsageFrequency ?? null,
      input.customUsesPerMonth ?? null,
      input.expectedOwnershipMonths ?? null,
      input.currentResaleValueCents == null ? null : Math.round(input.currentResaleValueCents),
      now,
      now,
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Purchase could not be created.');
    return created;
  }

  async update(id: string, update: PurchaseUpdate): Promise<PurchaseWithStats | null> {
    const assignments: string[] = [];
    const values: (string | number | null)[] = [];

    const set = (column: string, value: string | number | null): void => {
      assignments.push(`${column} = ?`);
      values.push(value);
    };

    if (update.name !== undefined) set('name', update.name.trim());
    if (update.purchasePriceCents !== undefined)
      set('purchase_price_cents', Math.round(update.purchasePriceCents));
    if (update.purchaseDate !== undefined) set('purchase_date', update.purchaseDate);
    if (update.categoryId !== undefined) set('category_id', update.categoryId);
    if (update.imageUri !== undefined) set('image_uri', update.imageUri);
    if (update.expectedUsageFrequency !== undefined)
      set('expected_usage_frequency', update.expectedUsageFrequency);
    if (update.customUsesPerMonth !== undefined)
      set('custom_uses_per_month', update.customUsesPerMonth);
    if (update.expectedOwnershipMonths !== undefined)
      set(
        'expected_ownership_months',
        update.expectedOwnershipMonths == null ? null : Math.round(update.expectedOwnershipMonths),
      );
    if (update.currentResaleValueCents !== undefined)
      set(
        'current_resale_value_cents',
        update.currentResaleValueCents == null ? null : Math.round(update.currentResaleValueCents),
      );

    if (assignments.length === 0) return this.findById(id);

    set('updated_at', nowIso());

    await this.db.runAsync(
      `UPDATE purchases SET ${assignments.join(', ')} WHERE id = ?`,
      ...values,
      id,
    );

    return this.findById(id);
  }

  async setResaleValue(id: string, valueCents: Cents | null): Promise<PurchaseWithStats | null> {
    return this.update(id, { currentResaleValueCents: valueCents });
  }

  /** Usage events and expenses are removed by `ON DELETE CASCADE`. */
  async remove(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM purchases WHERE id = ?', id);
  }
}

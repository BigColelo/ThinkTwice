import type { SQLiteDatabase } from 'expo-sqlite';

import { nowIso } from '@/utils/dates';

/**
 * Operations over the database as a whole rather than over one entity.
 *
 * There is exactly one today — "reset all local data" from Settings — and it
 * belongs here for the reason every other query does: SQL lives in
 * `src/db/repositories` and nowhere else. It used to sit in `src/db/database`,
 * which the Settings screen reached by taking the raw `SQLiteDatabase` handle
 * out of the provider, so the one screen able to delete everything was also the
 * only one holding a connection it could run anything on.
 */
export class MaintenanceRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  /**
   * Deletes every row while keeping the schema, and returns settings to their
   * defaults without touching the chosen currency, theme or language — those are
   * preferences about the app, not records about the user, and someone resetting
   * their data has not asked to be put back into English.
   *
   * One transaction: a reset that stopped halfway would leave purchases whose
   * wishlist items are gone, which is worse than not having started. Ordering
   * respects the foreign keys inside it.
   */
  async resetAllData(): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.execAsync(`
        DELETE FROM usage_events;
        DELETE FROM purchase_expenses;
        DELETE FROM purchases;
        DELETE FROM wishlist_items;
        DELETE FROM recurring_commitments;
      `);
      await this.db.runAsync(
        `UPDATE app_settings
            SET monthly_net_income_cents = 0,
                monthly_savings_target_cents = NULL,
                onboarding_completed = 0,
                cooldown_reminders_enabled = 0,
                updated_at = ?
          WHERE id = 1`,
        nowIso(),
      );
    });
  }
}

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './migrations';

/**
 * Opening and migrating the local database.
 *
 * ThinkTwice is local-first: this file is the app's entire storage story. There
 * is no remote database, no sync and no network call anywhere in the data path.
 */

export const DATABASE_NAME = 'thinktwice.db';

/** Raised when the database cannot be opened or migrated. Surfaced as an error screen. */
export class DatabaseInitError extends Error {
  override readonly name = 'DatabaseInitError';
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
  }
}

export async function openThinkTwiceDatabase(
  databaseName: string = DATABASE_NAME,
): Promise<SQLiteDatabase> {
  let db: SQLiteDatabase;
  try {
    db = await openDatabaseAsync(databaseName);
  } catch (error) {
    throw new DatabaseInitError('Could not open the local database.', error);
  }

  try {
    await configure(db);
    await migrate(db);
  } catch (error) {
    // Leave the handle closed rather than handing back a half-migrated database.
    await db.closeAsync().catch(() => undefined);
    throw new DatabaseInitError('Could not prepare the local database.', error);
  }

  return db;
}

async function configure(db: SQLiteDatabase): Promise<void> {
  // WAL keeps reads fast while a write is in flight; foreign keys are off by
  // default in SQLite and the schema relies on ON DELETE CASCADE.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
}

/**
 * Applies every migration newer than the stored `user_version`.
 * Each runs in its own transaction so a failure cannot leave a partial schema.
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion > LATEST_SCHEMA_VERSION) {
    // The database was written by a newer build of the app. Continuing could
    // corrupt data the current build does not understand.
    throw new Error(
      `Local database is at version ${currentVersion}, newer than this app understands (${LATEST_SCHEMA_VERSION}).`,
    );
  }

  const pending = MIGRATIONS.filter((migration) => migration.version > currentVersion).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      // `PRAGMA` does not accept bound parameters; the value is a number from
      // our own migration list, never user input.
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

/**
 * Deletes every row while keeping the schema — the "reset all local data"
 * action in Settings. Ordering respects foreign keys.
 */
export async function resetAllData(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM usage_events;
      DELETE FROM purchase_expenses;
      DELETE FROM purchases;
      DELETE FROM wishlist_items;
      DELETE FROM recurring_commitments;
    `);
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE app_settings
          SET monthly_net_income_cents = 0,
              monthly_savings_target_cents = NULL,
              onboarding_completed = 0,
              cooldown_reminders_enabled = 0,
              updated_at = ?
        WHERE id = 1`,
      now,
    );
  });
}

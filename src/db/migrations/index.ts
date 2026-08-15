import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Schema migrations.
 *
 * The database version is tracked with SQLite's own `PRAGMA user_version`.
 * Migrations run in order, each inside a transaction, and the version is only
 * bumped once a migration has fully succeeded — a failed migration therefore
 * leaves the database exactly as it was rather than half-applied.
 *
 * Adding a migration: append to `MIGRATIONS`. Never edit or reorder an existing
 * entry — installed apps have already run it.
 */

export type Migration = {
  /** Target `user_version` after this migration has run. Must be sequential from 1. */
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
};

const initial: Migration = {
  version: 1,
  name: 'initial_schema',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE app_settings (
        id                            INTEGER PRIMARY KEY CHECK (id = 1),
        currency_code                 TEXT    NOT NULL DEFAULT 'EUR',
        theme_mode                    TEXT    NOT NULL DEFAULT 'system',
        monthly_net_income_cents      INTEGER NOT NULL DEFAULT 0,
        monthly_savings_target_cents  INTEGER,
        onboarding_completed          INTEGER NOT NULL DEFAULT 0,
        cooldown_reminders_enabled    INTEGER NOT NULL DEFAULT 0,
        created_at                    TEXT    NOT NULL,
        updated_at                    TEXT    NOT NULL
      );

      CREATE TABLE recurring_commitments (
        id           TEXT    PRIMARY KEY NOT NULL,
        name         TEXT    NOT NULL,
        amount_cents INTEGER NOT NULL,
        frequency    TEXT    NOT NULL,
        category_id  TEXT    NOT NULL,
        is_active    INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT    NOT NULL,
        updated_at   TEXT    NOT NULL
      );
      CREATE INDEX idx_commitments_active ON recurring_commitments (is_active);

      CREATE TABLE wishlist_items (
        id                        TEXT    PRIMARY KEY NOT NULL,
        name                      TEXT    NOT NULL,
        price_cents               INTEGER NOT NULL,
        category_id               TEXT    NOT NULL,
        image_uri                 TEXT,
        expected_usage_frequency  TEXT    NOT NULL,
        custom_uses_per_month     REAL,
        expected_ownership_months INTEGER NOT NULL,
        cooldown_days             INTEGER NOT NULL,
        cooldown_started_at       TEXT    NOT NULL,
        cooldown_ends_at          TEXT    NOT NULL,
        status                    TEXT    NOT NULL,
        reason_tags               TEXT    NOT NULL DEFAULT '[]',
        notes                     TEXT,
        decided_at                TEXT,
        created_at                TEXT    NOT NULL,
        updated_at                TEXT    NOT NULL
      );
      -- The wishlist screen always queries by status, then orders by cooldown end.
      CREATE INDEX idx_wishlist_status ON wishlist_items (status, cooldown_ends_at);

      CREATE TABLE purchases (
        id                         TEXT    PRIMARY KEY NOT NULL,
        wishlist_item_id           TEXT    REFERENCES wishlist_items (id) ON DELETE SET NULL,
        name                       TEXT    NOT NULL,
        purchase_price_cents       INTEGER NOT NULL,
        purchase_date              TEXT    NOT NULL,
        category_id                TEXT    NOT NULL,
        image_uri                  TEXT,
        expected_usage_frequency   TEXT,
        custom_uses_per_month      REAL,
        expected_ownership_months  INTEGER,
        current_resale_value_cents INTEGER,
        created_at                 TEXT    NOT NULL,
        updated_at                 TEXT    NOT NULL
      );
      CREATE INDEX idx_purchases_date ON purchases (purchase_date DESC);
      CREATE INDEX idx_purchases_category ON purchases (category_id);

      CREATE TABLE usage_events (
        id          TEXT    PRIMARY KEY NOT NULL,
        purchase_id TEXT    NOT NULL REFERENCES purchases (id) ON DELETE CASCADE,
        occurred_at TEXT    NOT NULL,
        count       INTEGER NOT NULL DEFAULT 1,
        created_at  TEXT    NOT NULL
      );
      CREATE INDEX idx_usage_purchase ON usage_events (purchase_id, occurred_at DESC);

      CREATE TABLE purchase_expenses (
        id           TEXT    PRIMARY KEY NOT NULL,
        purchase_id  TEXT    NOT NULL REFERENCES purchases (id) ON DELETE CASCADE,
        name         TEXT    NOT NULL,
        amount_cents INTEGER NOT NULL,
        expense_type TEXT    NOT NULL,
        date         TEXT    NOT NULL,
        created_at   TEXT    NOT NULL
      );
      CREATE INDEX idx_expenses_purchase ON purchase_expenses (purchase_id);
    `);

    // The settings row is a singleton, created up-front so every read can rely
    // on it existing rather than handling "no settings yet" at each call site.
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO app_settings (id, created_at, updated_at) VALUES (1, ?, ?)`,
      now,
      now,
    );
  },
};

/**
 * Index corrections. Both were measured with `EXPLAIN QUERY PLAN` against the
 * schema above rather than guessed at.
 */
const purchaseLookupIndexes: Migration = {
  version: 2,
  name: 'purchase_lookup_indexes',
  up: async (db) => {
    await db.execAsync(`
      -- Finding the purchase an item was converted into is what stops a double
      -- tap creating two purchases, and it was a full table scan. The column is
      -- also the child key of an ON DELETE SET NULL foreign key, which SQLite
      -- resolves by scanning this table when it is unindexed.
      CREATE INDEX IF NOT EXISTS idx_purchases_wishlist_item ON purchases (wishlist_item_id);

      -- Nothing filters or groups by category in SQL: the insights breakdown is
      -- computed in the domain layer from rows that are already loaded. This
      -- index only ever cost writes.
      DROP INDEX IF EXISTS idx_purchases_category;
    `);
  },
};

/**
 * The interface language.
 *
 * `system` rather than `en` is the default so an install that predates this
 * column behaves like a fresh one: the app follows the device instead of
 * announcing itself in English to someone whose phone is in Italian.
 */
const settingsLanguage: Migration = {
  version: 3,
  name: 'settings_language',
  up: async (db) => {
    await db.execAsync(`
      ALTER TABLE app_settings ADD COLUMN language TEXT NOT NULL DEFAULT 'system';
    `);
  },
};

export const MIGRATIONS: readonly Migration[] = [initial, purchaseLookupIndexes, settingsLanguage];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce(
  (highest, migration) => Math.max(highest, migration.version),
  0,
);

import type { SQLiteDatabase } from 'expo-sqlite';

import type { AppSettings } from '@/types/domain';
import { nowIso } from '@/utils/dates';

import { fromBoolean, mapAppSettings, type AppSettingsRow } from '../mappers';

/**
 * The single application-settings row.
 *
 * Settings live in SQLite rather than in key-value storage because they hold
 * real financial data (net income, savings target) that belongs with the rest
 * of the user's records.
 */

export type SettingsUpdate = Partial<
  Pick<
    AppSettings,
    | 'currencyCode'
    | 'themeMode'
    | 'language'
    | 'monthlyNetIncomeCents'
    | 'monthlySavingsTargetCents'
    | 'onboardingCompleted'
    | 'cooldownRemindersEnabled'
  >
>;

const COLUMN_BY_FIELD: Record<keyof SettingsUpdate, string> = {
  currencyCode: 'currency_code',
  themeMode: 'theme_mode',
  language: 'language',
  monthlyNetIncomeCents: 'monthly_net_income_cents',
  monthlySavingsTargetCents: 'monthly_savings_target_cents',
  onboardingCompleted: 'onboarding_completed',
  cooldownRemindersEnabled: 'cooldown_reminders_enabled',
};

export class SettingsRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async get(): Promise<AppSettings> {
    const row = await this.db.getFirstAsync<AppSettingsRow>(
      `SELECT currency_code, theme_mode, language, monthly_net_income_cents,
              monthly_savings_target_cents, onboarding_completed, cooldown_reminders_enabled,
              created_at, updated_at
         FROM app_settings
        WHERE id = 1`,
    );

    if (row) return mapAppSettings(row);

    // The row is created by migration 1, so this only happens if it was removed
    // externally. Recreate it rather than failing the whole app.
    const now = nowIso();
    await this.db.runAsync(
      `INSERT OR IGNORE INTO app_settings (id, created_at, updated_at) VALUES (1, ?, ?)`,
      now,
      now,
    );
    return {
      currencyCode: 'EUR',
      themeMode: 'system',
      language: 'system',
      monthlyNetIncomeCents: 0,
      monthlySavingsTargetCents: null,
      onboardingCompleted: false,
      cooldownRemindersEnabled: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(update: SettingsUpdate): Promise<AppSettings> {
    const fields = Object.keys(update) as (keyof SettingsUpdate)[];
    if (fields.length === 0) return this.get();

    const assignments: string[] = [];
    const values: (string | number | null)[] = [];

    for (const field of fields) {
      const column = COLUMN_BY_FIELD[field];
      assignments.push(`${column} = ?`);
      values.push(toColumnValue(field, update[field]));
    }

    assignments.push('updated_at = ?');
    values.push(nowIso());

    await this.db.runAsync(
      `UPDATE app_settings SET ${assignments.join(', ')} WHERE id = 1`,
      ...values,
    );

    return this.get();
  }
}

function toColumnValue(
  field: keyof SettingsUpdate,
  value: SettingsUpdate[keyof SettingsUpdate],
): string | number | null {
  if (field === 'onboardingCompleted' || field === 'cooldownRemindersEnabled') {
    return fromBoolean(Boolean(value));
  }
  if (value == null) return null;
  if (typeof value === 'boolean') return fromBoolean(value);

  // The only numeric settings are money, and money reaches the database as
  // integer minor units — every other repository rounds on the way in, and the
  // columns are INTEGER. A fractional value would otherwise be stored as REAL,
  // and a non-finite one would poison every figure derived from income.
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : 0;

  return value;
}

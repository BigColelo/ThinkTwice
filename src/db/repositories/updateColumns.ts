import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Building a partial `UPDATE`.
 *
 * Every repository takes a `Partial<…>` and has to turn it into the columns
 * that were actually named, because `undefined` means "leave this alone" and
 * `null` means "set this to nothing" — a distinction the app relies on: clearing
 * a resale estimate is not the same as never having entered one. Four
 * repositories wrote the same accumulator, the same `if (x !== undefined)` in
 * front of every field, and the same "nothing to do" check.
 *
 * The values are always bound, never interpolated. Column names are literals
 * from the repository itself and never reach here from anything a user typed.
 */

export type SqlValue = string | number | null;

export class UpdateColumns {
  private readonly assignments: string[] = [];
  private readonly values: SqlValue[] = [];

  /** Records a column to write. `undefined` is skipped; `null` writes NULL. */
  set(column: string, value: SqlValue | undefined): this {
    if (value === undefined) return this;
    this.assignments.push(`${column} = ?`);
    this.values.push(value);
    return this;
  }

  /** True when the update named no column — the caller should not write at all. */
  get isEmpty(): boolean {
    return this.assignments.length === 0;
  }

  /** Runs `UPDATE <table> SET … WHERE id = ?`. */
  async update(db: SQLiteDatabase, table: string, id: string): Promise<void> {
    if (this.isEmpty) return;
    await db.runAsync(
      `UPDATE ${table} SET ${this.assignments.join(', ')} WHERE id = ?`,
      ...this.values,
      id,
    );
  }
}

/**
 * Money and whole-number columns, rounded on the way in, with the two kinds of
 * absence preserved: `undefined` stays "leave it alone" and `null` stays "clear
 * it". Integer columns are what stops a fractional value being stored as REAL.
 */
export function roundedOrSkip(value: number | null | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return Number.isFinite(value) ? Math.round(value) : null;
}

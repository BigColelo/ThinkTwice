import type { SQLiteDatabase } from 'expo-sqlite';

import { roundedOrSkip, UpdateColumns } from './updateColumns';

/**
 * The distinction every partial update in the app rests on: `undefined` leaves a
 * column alone, `null` writes NULL into it.
 *
 * Getting it backwards is silent and destructive in both directions. Treating
 * `undefined` as NULL would wipe the fields an edit did not mention — saving a
 * corrected name would clear the photo and the notes. Treating `null` as
 * "skip" would make clearing a resale estimate impossible, which is the one
 * case where the user means "I no longer have a figure" rather than "zero".
 */

type Captured = { sql: string; values: unknown[] };

function fakeDatabase(): { db: SQLiteDatabase; calls: Captured[] } {
  const calls: Captured[] = [];
  const db = {
    runAsync: async (sql: string, ...values: unknown[]) => {
      calls.push({ sql, values });
      return { changes: 1, lastInsertRowId: 0 };
    },
  } as unknown as SQLiteDatabase;

  return { db, calls };
}

describe('UpdateColumns', () => {
  it('writes only the columns that were named', async () => {
    const { db, calls } = fakeDatabase();

    await new UpdateColumns()
      .set('name', 'Camera')
      .set('notes', undefined)
      .set('price_cents', 179_900)
      .update(db, 'wishlist_items', 'w1');

    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toBe('UPDATE wishlist_items SET name = ?, price_cents = ? WHERE id = ?');
    expect(calls[0]?.values).toEqual(['Camera', 179_900, 'w1']);
  });

  it('writes NULL for a column explicitly cleared', async () => {
    const { db, calls } = fakeDatabase();

    await new UpdateColumns().set('current_resale_value_cents', null).update(db, 'purchases', 'p1');

    expect(calls[0]?.sql).toBe('UPDATE purchases SET current_resale_value_cents = ? WHERE id = ?');
    expect(calls[0]?.values).toEqual([null, 'p1']);
  });

  it('reports an update that named nothing, and writes nothing at all', async () => {
    const { db, calls } = fakeDatabase();
    const columns = new UpdateColumns().set('name', undefined).set('notes', undefined);

    expect(columns.isEmpty).toBe(true);

    await columns.update(db, 'wishlist_items', 'w1');
    expect(calls).toHaveLength(0);
  });

  it('binds every value rather than putting it in the statement', async () => {
    // The values are user text; the column names are literals from the repository.
    const { db, calls } = fakeDatabase();

    await new UpdateColumns()
      .set('name', "Robert'); DROP TABLE purchases;--")
      .update(db, 'purchases', 'p1');

    expect(calls[0]?.sql).toBe('UPDATE purchases SET name = ? WHERE id = ?');
    expect(calls[0]?.values[0]).toBe("Robert'); DROP TABLE purchases;--");
  });
});

describe('roundedOrSkip', () => {
  it('keeps the two kinds of absence apart', () => {
    expect(roundedOrSkip(undefined)).toBeUndefined();
    expect(roundedOrSkip(null)).toBeNull();
  });

  it('rounds to the whole minor unit an INTEGER column expects', () => {
    // A fractional value would otherwise be stored as REAL in an INTEGER column.
    expect(roundedOrSkip(1_799.6)).toBe(1_800);
    expect(roundedOrSkip(0)).toBe(0);
  });

  it('stores nothing rather than a figure that is not a number', () => {
    expect(roundedOrSkip(Number.NaN)).toBeNull();
    expect(roundedOrSkip(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

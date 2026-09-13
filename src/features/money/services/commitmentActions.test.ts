import { invalidate, resetRevisionsForTesting } from '@/db/dataRevisions';
import type { Repositories } from '@/db/repositories';
import type { RecurringCommitment } from '@/types/domain';

import { createCommitment, deleteCommitment, updateCommitment } from './commitmentActions';

/**
 * Every commitment is subtracted from the month that the impact of every
 * purchase is measured against, so what matters here is not the write itself
 * but that the write announces itself: a screen left holding a stale
 * `availableAfterCommitments` quotes a percentage of money the user no longer
 * has, and says nothing to suggest it is out of date.
 *
 * These ran inside the commitment screen before, where nothing could reach
 * them without a database and a rendered form.
 */

jest.mock('@/db/dataRevisions', () => {
  const actual = jest.requireActual('@/db/dataRevisions');
  return { ...actual, invalidate: jest.fn(actual.invalidate) };
});

const invalidateMock = invalidate as jest.MockedFunction<typeof invalidate>;

function commitment(overrides: Partial<RecurringCommitment> = {}): RecurringCommitment {
  return {
    id: 'c1',
    name: 'Rent',
    amountCents: 60_000,
    frequency: 'monthly',
    categoryId: 'housing',
    isActive: true,
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-08-01T09:00:00.000Z',
    ...overrides,
  };
}

type Harness = { repositories: Repositories; rows: Map<string, RecurringCommitment> };

function createHarness(initial: RecurringCommitment[] = []): Harness {
  const rows = new Map(initial.map((row) => [row.id, row]));
  let nextId = 1;

  const repositories = {
    commitments: {
      create: jest.fn(async (input: Partial<RecurringCommitment>) => {
        const created = commitment({ id: `c-${nextId++}`, ...input });
        rows.set(created.id, created);
        return created;
      }),
      update: jest.fn(async (id: string, update: Partial<RecurringCommitment>) => {
        const existing = rows.get(id);
        if (!existing) return null;
        const next = { ...existing, ...update };
        rows.set(id, next);
        return next;
      }),
      remove: jest.fn(async (id: string) => {
        rows.delete(id);
      }),
    },
  } as unknown as Repositories;

  return { repositories, rows };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetRevisionsForTesting();
});

describe('createCommitment', () => {
  it('stores the commitment and returns what was stored', async () => {
    const { repositories, rows } = createHarness();

    const created = await createCommitment(repositories, {
      name: 'Gym',
      amountCents: 3_500,
      frequency: 'monthly',
      categoryId: 'health_fitness',
    });

    expect(created.name).toBe('Gym');
    expect(rows.get(created.id)?.amountCents).toBe(3_500);
  });

  it('invalidates commitments, so every figure derived from the month re-reads', async () => {
    const { repositories } = createHarness();

    await createCommitment(repositories, {
      name: 'Gym',
      amountCents: 3_500,
      frequency: 'monthly',
      categoryId: 'health_fitness',
    });

    expect(invalidateMock).toHaveBeenCalledWith('commitments');
  });
});

describe('updateCommitment', () => {
  it('applies the change and returns the updated row', async () => {
    const { repositories } = createHarness([commitment()]);

    const updated = await updateCommitment(repositories, 'c1', { amountCents: 65_000 });

    expect(updated.amountCents).toBe(65_000);
    expect(invalidateMock).toHaveBeenCalledWith('commitments');
  });

  it('pausing keeps the row rather than removing it', async () => {
    // A commitment that vanished when it was paused could never be brought back.
    const { repositories, rows } = createHarness([commitment()]);

    await updateCommitment(repositories, 'c1', { isActive: false });

    expect(rows.get('c1')?.isActive).toBe(false);
  });

  it('refuses an id that is no longer there rather than reporting success', async () => {
    const { repositories } = createHarness();

    await expect(updateCommitment(repositories, 'gone', { name: 'x' })).rejects.toThrow(
      'could no longer be found',
    );
    // Nothing changed, so nothing re-reads.
    expect(invalidateMock).not.toHaveBeenCalled();
  });
});

describe('deleteCommitment', () => {
  it('removes the row and says so', async () => {
    const { repositories, rows } = createHarness([commitment()]);

    await deleteCommitment(repositories, 'c1');

    expect(rows.has('c1')).toBe(false);
    expect(invalidateMock).toHaveBeenCalledWith('commitments');
  });
});

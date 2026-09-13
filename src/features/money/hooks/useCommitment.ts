import { useDatabaseQuery, type QueryResult } from '@/db/useDatabaseQuery';
import type { RecurringCommitment } from '@/types/domain';

/** A single commitment, for the form that edits it. */
export function useCommitment(id: string | undefined): QueryResult<RecurringCommitment | null> {
  return useDatabaseQuery(
    ['commitments'],
    async (repositories) => (id ? repositories.commitments.findById(id) : null),
    [id],
  );
}

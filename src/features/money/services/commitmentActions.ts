import { invalidate } from '@/db/dataRevisions';
import type {
  NewRecurringCommitment,
  RecurringCommitmentUpdate,
  Repositories,
} from '@/db/repositories';
import type { RecurringCommitment } from '@/types/domain';

/**
 * Recurring-commitment write operations.
 *
 * Every commitment feeds `availableAfterCommitmentsCents`, which is the figure
 * the impact of every purchase is measured against — so a write that did not
 * invalidate would leave Home, the wishlist form and Insights quoting a month
 * that no longer exists. The commitment form used to call the repository and
 * `invalidate` itself, the only screen in the app still doing its own writes;
 * putting them here makes that impossible to forget and testable without a
 * database.
 */

export async function createCommitment(
  repositories: Repositories,
  input: NewRecurringCommitment,
): Promise<RecurringCommitment> {
  const commitment = await repositories.commitments.create(input);
  invalidate('commitments');
  return commitment;
}

export async function updateCommitment(
  repositories: Repositories,
  id: string,
  update: RecurringCommitmentUpdate,
): Promise<RecurringCommitment> {
  const updated = await repositories.commitments.update(id, update);
  if (!updated) throw new Error('This commitment could no longer be found.');

  invalidate('commitments');
  return updated;
}

/**
 * Removes a commitment outright.
 *
 * Pausing is the other way out, and the one the form offers first: a commitment
 * that stops counting towards the month but stays in the list can be brought
 * back, and a deleted one cannot.
 */
export async function deleteCommitment(repositories: Repositories, id: string): Promise<void> {
  await repositories.commitments.remove(id);
  invalidate('commitments');
}

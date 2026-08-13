import { invalidate } from '@/db/dataRevisions';
import type { NewPurchase, NewPurchaseExpense, Repositories } from '@/db/repositories';
import { deleteItemImage, persistItemImage } from '@/features/images/itemImages';
import type {
  Cents,
  Purchase,
  PurchaseExpense,
  PurchaseWithStats,
  UsageEvent,
} from '@/types/domain';

/**
 * Purchase write operations.
 *
 * `recordUse` is the app's most-used action, so it is a single insert with no
 * read-modify-write: one tap, one row, and the totals are recomputed by the
 * queries that need them.
 */

export async function createOwnedPurchase(
  repositories: Repositories,
  input: NewPurchase,
): Promise<PurchaseWithStats> {
  const purchase = await repositories.purchases.create({
    ...input,
    // Copied into app storage only now, so a form the user abandoned never
    // leaves a photo behind.
    imageUri: await persistItemImage(input.imageUri),
  });
  invalidate('purchases');
  return purchase;
}

export async function recordUse(
  repositories: Repositories,
  purchaseId: string,
): Promise<UsageEvent> {
  const event = await repositories.usage.recordUse(purchaseId);
  invalidate('usage', 'purchases');
  return event;
}

/** Undoes the most recently recorded use. Returns `null` when there was none. */
export async function undoLastUse(
  repositories: Repositories,
  purchaseId: string,
): Promise<UsageEvent | null> {
  const removed = await repositories.usage.undoLastUse(purchaseId);
  if (removed) invalidate('usage', 'purchases');
  return removed;
}

export async function addPurchaseExpense(
  repositories: Repositories,
  input: NewPurchaseExpense,
): Promise<PurchaseExpense> {
  const expense = await repositories.expenses.create(input);
  invalidate('expenses', 'purchases');
  return expense;
}

export async function removePurchaseExpense(
  repositories: Repositories,
  expenseId: string,
): Promise<void> {
  await repositories.expenses.remove(expenseId);
  invalidate('expenses', 'purchases');
}

/** `null` clears the estimate, which is different from an estimate of zero. */
export async function setResaleValue(
  repositories: Repositories,
  purchaseId: string,
  valueCents: Cents | null,
): Promise<void> {
  await repositories.purchases.setResaleValue(purchaseId, valueCents);
  invalidate('purchases');
}

export async function updatePurchase(
  repositories: Repositories,
  purchaseId: string,
  update: Partial<NewPurchase>,
): Promise<void> {
  await repositories.purchases.update(purchaseId, update);
  invalidate('purchases');
}

/** Usage events and expenses are removed by the schema's cascade. */
export async function deletePurchase(
  repositories: Repositories,
  purchase: Pick<Purchase, 'id' | 'imageUri'>,
): Promise<void> {
  await repositories.purchases.remove(purchase.id);
  await deleteItemImage(purchase.imageUri);
  invalidate('purchases', 'usage', 'expenses');
}

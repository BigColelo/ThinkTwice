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

/**
 * Applies an edit to an owned item.
 *
 * Nothing needs recomputing: the real cost, the cost per use and the ownership
 * duration are all derived on read from price, expenses, uses and date. The only
 * care needed is the photo — the new one has to reach app storage, and the one it
 * replaced has to go, unless the wishlist item this purchase came from is still
 * showing the same file.
 */
export async function updatePurchase(
  repositories: Repositories,
  purchase: Pick<Purchase, 'id' | 'imageUri' | 'wishlistItemId'>,
  input: NewPurchase,
): Promise<PurchaseWithStats> {
  // Idempotent for a URI already in app storage, so an untouched photo is not
  // copied a second time.
  const imageUri = await persistItemImage(input.imageUri);

  const updated = await repositories.purchases.update(purchase.id, { ...input, imageUri });
  if (!updated) throw new Error('This purchase could no longer be found.');

  invalidate('purchases');

  // Only once the new one is safely stored, and only if it was really replaced.
  if (purchase.imageUri !== imageUri) {
    await deleteImageUnlessShared(repositories, purchase.imageUri, purchase.wishlistItemId);
  }

  return updated;
}

/** Usage events and expenses are removed by the schema's cascade. */
export async function deletePurchase(
  repositories: Repositories,
  purchase: Pick<Purchase, 'id' | 'imageUri' | 'wishlistItemId'>,
): Promise<void> {
  await repositories.purchases.remove(purchase.id);
  await deleteImageUnlessShared(repositories, purchase.imageUri, purchase.wishlistItemId);
  invalidate('purchases', 'usage', 'expenses');
}

/**
 * Removes a stored photo unless the wishlist item a purchase came from still
 * points at the same file: conversion copies the URI, not the picture, so two
 * rows can share one file and whichever leaves first must not take it with them.
 */
async function deleteImageUnlessShared(
  repositories: Repositories,
  imageUri: string | null,
  wishlistItemId: string | null,
): Promise<void> {
  if (imageUri == null) return;

  const origin = wishlistItemId ? await repositories.wishlist.findById(wishlistItemId) : null;
  if (origin?.imageUri === imageUri) return;

  await deleteItemImage(imageUri);
}

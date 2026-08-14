import type { SQLiteDatabase } from 'expo-sqlite';

import { PurchaseExpenseRepository } from './PurchaseExpenseRepository';
import { PurchaseRepository } from './PurchaseRepository';
import { RecurringCommitmentRepository } from './RecurringCommitmentRepository';
import { SettingsRepository } from './SettingsRepository';
import { UsageRepository } from './UsageRepository';
import { WishlistRepository } from './WishlistRepository';

/**
 * The boundary between the app and storage.
 *
 * Every read and write goes through a repository — no screen, hook or domain
 * function contains SQL. That is what makes it possible to add sync or a
 * different store later without touching a single screen.
 */
export type Repositories = {
  settings: SettingsRepository;
  commitments: RecurringCommitmentRepository;
  wishlist: WishlistRepository;
  purchases: PurchaseRepository;
  usage: UsageRepository;
  expenses: PurchaseExpenseRepository;
};

export function createRepositories(db: SQLiteDatabase): Repositories {
  return {
    settings: new SettingsRepository(db),
    commitments: new RecurringCommitmentRepository(db),
    wishlist: new WishlistRepository(db),
    purchases: new PurchaseRepository(db),
    usage: new UsageRepository(db),
    expenses: new PurchaseExpenseRepository(db),
  };
}

export {
  PurchaseExpenseRepository,
  type NewPurchaseExpense,
  type PurchaseExpenseUpdate,
} from './PurchaseExpenseRepository';
export {
  PurchaseRepository,
  PURCHASE_SORTS,
  type NewPurchase,
  type PurchaseSort,
  type PurchaseUpdate,
} from './PurchaseRepository';
export {
  RecurringCommitmentRepository,
  type NewRecurringCommitment,
  type RecurringCommitmentUpdate,
} from './RecurringCommitmentRepository';
export { SettingsRepository, type SettingsUpdate } from './SettingsRepository';
export { UsageRepository } from './UsageRepository';
export {
  WishlistRepository,
  type NewWishlistItem,
  type WishlistItemUpdate,
} from './WishlistRepository';

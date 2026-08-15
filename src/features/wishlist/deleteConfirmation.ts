import type { TFunction } from 'i18next';

import type { WishlistStatus } from '@/types/domain';
import type { ConfirmOptions } from '@/utils/confirm';

/**
 * What deleting a wishlist item costs, said before it happens.
 *
 * Deletion stays available whatever the item's state — this is a local-first app
 * and the data is the user's to remove. But what is lost differs by state, and a
 * single generic sentence would hide it: an open item takes its elapsed
 * reflection period with it, a dismissed one disappears from what the user
 * decided against, and a purchased one leaves its purchase behind with nothing
 * left to compare against.
 *
 * It lives here rather than in the screen so the three consequences can be
 * tested, and not in the domain, which returns data rather than sentences.
 */

export function wishlistDeleteConfirmation(t: TFunction, status: WishlistStatus): ConfirmOptions {
  return {
    title: t('wishlist.deleteTitle'),
    message: `${consequenceOf(t, status)} ${t('common.cannotBeUndone')}`,
    confirmLabel: t('common.delete'),
    destructive: true,
  };
}

function consequenceOf(t: TFunction, status: WishlistStatus): string {
  switch (status) {
    case 'purchased':
      return t('wishlist.deleteConsequence.purchased');
    case 'dismissed':
      return t('wishlist.deleteConsequence.dismissed');
    case 'thinking':
    case 'ready_to_decide':
      return t('wishlist.deleteConsequence.open');
  }
}

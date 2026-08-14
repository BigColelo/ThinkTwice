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

export function wishlistDeleteConfirmation(status: WishlistStatus): ConfirmOptions {
  return {
    title: 'Delete this item?',
    message: `${consequenceOf(status)} This cannot be undone.`,
    confirmLabel: 'Delete',
    destructive: true,
  };
}

function consequenceOf(status: WishlistStatus): string {
  switch (status) {
    case 'purchased':
      return 'The purchase itself stays in ThinkTwice, but the estimate you made before buying it is lost, so there will be nothing left to compare with what it really costs.';
    case 'dismissed':
      return 'It will be removed from ThinkTwice completely, including from what you decided against.';
    case 'thinking':
    case 'ready_to_decide':
      return 'It will be removed from ThinkTwice completely, and the reflection period you have already spent on it goes with it.';
  }
}

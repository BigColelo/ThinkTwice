import type { WishlistStatus } from '@/types/domain';

import { wishlistDeleteConfirmation } from './deleteConfirmation';

const STATUSES: readonly WishlistStatus[] = [
  'thinking',
  'ready_to_decide',
  'purchased',
  'dismissed',
];

describe('wishlistDeleteConfirmation', () => {
  it('warns that an open item takes its elapsed reflection period with it', () => {
    const confirmation = wishlistDeleteConfirmation('thinking');

    expect(confirmation.message).toContain('reflection period you have already spent');
    expect(confirmation.message).toContain('This cannot be undone.');
  });

  it('says a dismissed item also leaves what the user decided against', () => {
    // Otherwise the figure on Insights would drop with no explanation.
    expect(wishlistDeleteConfirmation('dismissed').message).toContain(
      'including from what you decided against',
    );
  });

  it('says a purchased item keeps its purchase but loses the estimate', () => {
    const message = wishlistDeleteConfirmation('purchased').message;

    expect(message).toContain('The purchase itself stays');
    expect(message).toContain('estimate you made before buying');
  });

  it('gives an item awaiting a decision the same warning as one still in progress', () => {
    // The two differ only in whether the clock has run out; the loss is identical.
    expect(wishlistDeleteConfirmation('ready_to_decide')).toEqual(
      wishlistDeleteConfirmation('thinking'),
    );
  });

  it('is always destructive and always asks before deleting', () => {
    for (const status of STATUSES) {
      const confirmation = wishlistDeleteConfirmation(status);

      expect(confirmation.destructive).toBe(true);
      expect(confirmation.confirmLabel).toBe('Delete');
      expect(confirmation.title).toBe('Delete this item?');
    }
  });

  it('never falls back to one message for states that lose different things', () => {
    const messages = new Set(STATUSES.map((status) => wishlistDeleteConfirmation(status).message));

    // thinking and ready_to_decide share one; purchased and dismissed have their own.
    expect(messages.size).toBe(3);
  });
});

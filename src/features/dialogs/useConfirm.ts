import { useCallback } from 'react';

import { useT } from '@/i18n';
import { confirm, type ConfirmOptions } from '@/utils/confirm';

/**
 * A confirmation dialog in the language of the screen that opens it.
 *
 * The adapter in `src/utils/confirm` requires both button labels and knows no
 * language. Every caller has to name the action it is confirming, but the
 * dismissal reads "Cancel" in every dialog in the app, so it is filled in here
 * from the `t` the component was rendered with — which is also what ties the
 * dialog to the screen's language rather than to whatever happens to be current.
 *
 * This is the only way a screen opens a confirmation; `no-restricted-imports`
 * keeps the adapter itself out of reach, so the choice this hook removes cannot
 * quietly come back.
 */

/** What a caller states. The dismissal label is supplied unless it says otherwise. */
export type ConfirmRequest = Omit<ConfirmOptions, 'cancelLabel'> &
  Partial<Pick<ConfirmOptions, 'cancelLabel'>>;

export function useConfirm(): (request: ConfirmRequest) => Promise<boolean> {
  const t = useT();

  return useCallback(
    (request: ConfirmRequest) =>
      confirm({ ...request, cancelLabel: request.cancelLabel ?? t('common.cancel') }),
    [t],
  );
}

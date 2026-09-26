import { useEffect, useRef } from 'react';

/**
 * Rebuilds a sheet's form from its inputs every time the sheet opens.
 *
 * A sheet stays mounted while it is hidden, and react-hook-form reads its
 * default values once, on mount. Without this a sheet reopened on whatever it
 * last held: the expense just added, one tap away from being added twice, or the
 * price an item had before it was edited. `values` is called at the moment of
 * opening, so a date defaulting to today is today's again too.
 *
 * A plain effect, deliberately not a layout effect. The fields mount with the
 * sheet and subscribe to the form in effects of their own, which run before
 * their parent's; a reset in a layout effect would land before they were
 * listening, and they would go on showing the old values. The sheet slides in
 * from below the screen edge, so its first frame is not one anyone sees.
 */
export function useResetOnOpen<T>(
  visible: boolean,
  reset: (values: T) => void,
  values: () => T,
): void {
  const wasVisible = useRef(visible);

  useEffect(() => {
    if (visible && !wasVisible.current) reset(values());
    wasVisible.current = visible;
  });
}

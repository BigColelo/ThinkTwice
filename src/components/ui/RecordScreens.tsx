import React from 'react';

import { Screen } from './Screen';
import { ScreenHeader } from './ScreenHeader';
import { ErrorState, LoadingState } from './StateViews';

/**
 * The two screens every detail and edit route in the app renders before it can
 * render anything of its own: the read is still in flight, or it came back with
 * nothing.
 *
 * They are whole screens rather than a spinner dropped into the body, because
 * the header has to be there in both: a route opened from a deep link or a
 * tapped reminder has nothing behind it, and a screen with no way back while it
 * loads is a screen the user can be stuck on. Five routes had written the same
 * pair by hand, and the two that left the title out while loading made the
 * header appear to change as the record arrived.
 */

export function LoadingScreen({
  title,
  onBack,
}: {
  /** Omitted where the title is the record's own name, which is not known yet. */
  title?: string;
  onBack: () => void;
}): React.ReactElement {
  return (
    <>
      <ScreenHeader title={title} onBack={onBack} />
      <Screen>
        <LoadingState />
      </Screen>
    </>
  );
}

/**
 * The record is not there — deleted on another screen, or a link to something
 * that no longer exists.
 *
 * `onRetry` is deliberately optional: a read that failed is worth trying again,
 * while a record that is genuinely gone is not, and offering the button anyway
 * would promise something the app cannot deliver.
 */
export function MissingRecordScreen({
  title,
  onBack,
  heading,
  description,
  onRetry,
}: {
  title?: string;
  onBack: () => void;
  heading: string;
  description: string;
  onRetry?: () => void;
}): React.ReactElement {
  return (
    <>
      <ScreenHeader title={title} onBack={onBack} />
      <Screen>
        <ErrorState title={heading} description={description} onRetry={onRetry} />
      </Screen>
    </>
  );
}

import React from 'react';

import { useTheme, type SpacingKey } from '@/theme';

import { AppText } from './AppText';

/**
 * A failure said in place, next to the thing that failed.
 *
 * Announced as an alert, so a screen reader reads it out the moment it appears
 * rather than whenever focus happens to reach it, and set as caption text in the
 * danger colour — words first, colour as the second signal, never the only one.
 * Eighteen places had written the same five lines by hand; the one thing that
 * differed between them was the space above.
 *
 * Renders nothing when there is nothing to say, so a caller passes the message it
 * holds — `null` most of the time — instead of wrapping each one in a check.
 */
export function InlineError({
  message,
  spaceAbove,
}: {
  message: string | null | undefined;
  /** Left out inside a container that already spaces its children with `gap`. */
  spaceAbove?: SpacingKey;
}): React.ReactElement | null {
  const theme = useTheme();

  if (!message) return null;

  return (
    <AppText
      variant="caption"
      color="danger"
      accessibilityRole="alert"
      style={spaceAbove ? { marginTop: theme.spacing[spaceAbove] } : undefined}
    >
      {message}
    </AppText>
  );
}

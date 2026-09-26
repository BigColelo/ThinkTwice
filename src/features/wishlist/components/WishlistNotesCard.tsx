import React from 'react';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme';

/**
 * Why the user wanted the item, in their own words — shown back to them at the
 * moment of deciding, when it is most worth re-reading.
 */
export function WishlistNotesCard({ notes }: { notes: string }): React.ReactElement {
  const theme = useTheme();

  return (
    <Card padding={theme.spacing.md}>
      <AppText variant="body" color="secondary">
        {notes}
      </AppText>
    </Card>
  );
}

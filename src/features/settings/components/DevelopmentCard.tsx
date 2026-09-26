import React from 'react';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineError } from '@/components/ui/InlineError';
import { useRepositories } from '@/db/DatabaseProvider';
import { seedDevelopmentData } from '@/db/devSeed';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * Loads the sample data. Only ever rendered in a development build — the caller
 * checks `isDevSeedAvailable()` — and the seed refuses to run outside one
 * regardless, so invented figures cannot reach a production database.
 *
 * The seed names every entity it wrote, settings included, so every open screen
 * and the settings provider re-read on their own; `onSeeded` only decides where
 * to go next.
 */
export function DevelopmentCard({ onSeeded }: { onSeeded: () => void }): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const repositories = useRepositories();
  const seed = useAsyncAction();

  const handleSeed = async (): Promise<void> => {
    const seeded = await seed.run(() => seedDevelopmentData(repositories), {
      // Development only, so the generic message is enough.
      errorMessage: t('common.somethingWentWrong'),
      stayBusyOnSuccess: true,
    });
    if (seeded) onSeeded();
  };

  return (
    <Card padding={theme.spacing.md}>
      <Button
        label={t('settings.development.seed')}
        variant="secondary"
        size="md"
        onPress={handleSeed}
        loading={seed.isRunning}
      />
      <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.xs }}>
        {t('settings.development.seedDescription')}
      </AppText>
      <InlineError message={seed.error} spaceAbove="xs" />
    </Card>
  );
}

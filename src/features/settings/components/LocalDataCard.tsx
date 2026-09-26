import { Database, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { InlineError } from '@/components/ui/InlineError';
import { Spacer } from '@/components/ui/Spacer';
import { useRepositories } from '@/db/DatabaseProvider';
import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { useConfirm } from '@/features/dialogs/useConfirm';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import { resetAllLocalData } from '@/features/settings/services/dataActions';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * Where the data lives, and the control that takes all of it back.
 *
 * The card does not navigate after a reset. The reset clears the onboarding
 * flag, the settings provider re-reads it, and the root layout's redirect sends
 * the user back to onboarding; navigating from here as well would race that
 * re-read, land on onboarding while the old settings still said it was done,
 * and bounce off Home on the way. So the button stays busy until that redirect
 * has taken the screen away.
 */
export function LocalDataCard(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const repositories = useRepositories();
  const confirm = useConfirm();
  const reset = useAsyncAction();

  const handleReset = async (): Promise<void> => {
    const confirmed = await confirm({
      title: t('settings.data.resetTitle'),
      message: t('settings.data.resetMessage'),
      confirmLabel: t('settings.data.resetConfirm'),
      destructive: true,
    });
    if (!confirmed) return;

    await reset.run(() => resetAllLocalData(repositories), {
      errorMessage: t('settings.data.resetError'),
      stayBusyOnSuccess: true,
    });
  };

  return (
    <Card padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <IconTile icon={Database} tint="blue" />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{t('settings.data.heading')}</AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.xxxs }}>
            {t('settings.data.schemaVersion', { version: LATEST_SCHEMA_VERSION })}
          </AppText>
        </View>
      </View>

      <Spacer size="md" />

      <Button
        label={t('settings.data.reset')}
        icon={RotateCcw}
        variant="destructive"
        size="md"
        onPress={handleReset}
        loading={reset.isRunning}
      />
      <InlineError message={reset.error} spaceAbove="sm" />
    </Card>
  );
}

import { Bell } from 'lucide-react-native';
import React, { useState } from 'react';
import { Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { InlineError } from '@/components/ui/InlineError';
import { useRepositories } from '@/db/DatabaseProvider';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import {
  disableCooldownReminders,
  enableCooldownReminders,
  type EnableRemindersOutcome,
} from '@/features/settings/services/reminderActions';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useT } from '@/i18n';
import {
  areLocalNotificationsSupported,
  localNotificationsUnavailableReason,
} from '@/notifications/cooldownNotifications';
import { useTheme } from '@/theme';

/**
 * The reminders switch, and what became of the last time it was moved.
 *
 * Turning reminders on can end three ways — on, refused by the user, or not
 * possible here — and the switch alone can only show one of them, so the card
 * says which. Where local scheduling does not exist the switch is disabled, and
 * a dead control without a reason next to it is just confusing, so the reason
 * is given too.
 */
export function RemindersCard(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const repositories = useRepositories();
  const { settings } = useSettings();
  const toggle = useAsyncAction();
  const [outcome, setOutcome] = useState<EnableRemindersOutcome | null>(null);

  const unavailableFor = localNotificationsUnavailableReason();

  const handleToggle = (enabled: boolean): void => {
    setOutcome(null);
    void toggle.run(
      async () => {
        if (enabled) setOutcome(await enableCooldownReminders(repositories));
        else await disableCooldownReminders(repositories);
      },
      // The switch follows the stored value, so it already shows the truth;
      // this says why it did not move.
      { errorMessage: t('settings.saveError') },
    );
  };

  return (
    <Card padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <IconTile icon={Bell} tint="violet" />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{t('settings.notifications.remindersTitle')}</AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.xxxs }}>
            {t('settings.notifications.remindersSubtitle')}
          </AppText>
        </View>
        <Switch
          accessibilityLabel={t('settings.notifications.remindersTitle')}
          value={settings.cooldownRemindersEnabled}
          onValueChange={handleToggle}
          // Also while a change is in flight: a second flip would race the
          // permission prompt and the rescheduling behind the first.
          disabled={!areLocalNotificationsSupported() || toggle.isRunning}
          trackColor={{ true: theme.colors.accent.base, false: theme.colors.borderStrong }}
        />
      </View>

      {unavailableFor ? (
        <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.sm }}>
          {unavailableFor === 'expo_go'
            ? t('settings.notifications.expoGo')
            : t('settings.notifications.platformUnavailable')}
        </AppText>
      ) : null}

      {outcome ? (
        <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.sm }}>
          {outcome.status === 'enabled'
            ? outcome.scheduled > 0
              ? t('settings.notifications.enabledWithPending', { count: outcome.scheduled })
              : t('settings.notifications.enabled')
            : outcome.status === 'unsupported'
              ? t('settings.notifications.unsupported')
              : t('settings.notifications.denied')}
        </AppText>
      ) : null}

      <InlineError message={toggle.error} spaceAbove="sm" />
    </Card>
  );
}

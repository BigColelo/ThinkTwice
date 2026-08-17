import {
  Bell,
  Coins,
  Database,
  Euro,
  Globe,
  Lock,
  Moon,
  RotateCcw,
  Sun,
  SunMoon,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { getCurrency } from '@/constants/currencies';
import { resetAllData } from '@/db/database';
import { useDatabase, useRepositories } from '@/db/DatabaseProvider';
import { invalidate } from '@/db/dataRevisions';
import { isDevSeedAvailable, seedDevelopmentData } from '@/db/devSeed';
import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { deleteAllItemImages } from '@/features/images/itemImages';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useGoBack } from '@/features/navigation/useGoBack';
import { appVersion } from '@/features/settings/appVersion';
import { AboutCard } from '@/features/settings/components/AboutCard';
import { useSettings } from '@/features/settings/SettingsProvider';
import { LANGUAGE_NATIVE_NAMES, resolveLanguage, useT } from '@/i18n';
import {
  areLocalNotificationsSupported,
  cancelAllCooldownReminders,
  localNotificationsUnavailableReason,
  requestNotificationPermission,
  rescheduleAllCooldownReminders,
} from '@/notifications/cooldownNotifications';
import { useTheme } from '@/theme';
import type { ThemeMode } from '@/types/domain';
import { confirm } from '@/utils/confirm';

/**
 * Appearance, currency, reminders, and the controls that let the user take
 * their data back — including deleting all of it.
 */
export default function SettingsScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useAppRouter();
  const { settings, updateSettings, reloadSettings } = useSettings();
  const database = useDatabase();
  const repositories = useRepositories();

  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const goBack = useGoBack('/');

  // The switch is disabled where local scheduling does not exist; without a
  // reason next to it, a dead control is just confusing.
  const remindersUnavailableFor = localNotificationsUnavailableReason();

  const handleSeed = async (): Promise<void> => {
    setIsSeeding(true);
    try {
      await seedDevelopmentData(repositories);
      // The seed writes settings straight through the repository, so the
      // provider's in-memory copy has to be re-read or the app would keep
      // showing the pre-seed income.
      await reloadSettings();
      router.replace('/');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRemindersToggle = async (enabled: boolean): Promise<void> => {
    setNotificationMessage(null);

    if (!enabled) {
      await updateSettings({ cooldownRemindersEnabled: false });
      await cancelAllCooldownReminders();
      return;
    }

    // Permission is requested here — the moment it becomes useful — rather than
    // at first launch.
    const outcome = await requestNotificationPermission();

    if (outcome === 'granted') {
      await updateSettings({ cooldownRemindersEnabled: true });

      // Items already in a reflection period were created before permission
      // existed, so nothing was scheduled for them. Cover them now, otherwise
      // "reminders on" would only apply to items added from here on.
      const openItems = await repositories.wishlist.listOpen();
      const scheduled = await rescheduleAllCooldownReminders(openItems);

      setNotificationMessage(
        scheduled > 0
          ? t('settings.notifications.enabledWithPending', { count: scheduled })
          : t('settings.notifications.enabled'),
      );
      return;
    }

    if (outcome === 'unsupported') {
      setNotificationMessage(t('settings.notifications.unsupported'));
      return;
    }

    setNotificationMessage(t('settings.notifications.denied'));
  };

  const handleReset = async (): Promise<void> => {
    const confirmed = await confirm({
      title: t('settings.data.resetTitle'),
      message: t('settings.data.resetMessage'),
      confirmLabel: t('settings.data.resetConfirm'),
      destructive: true,
    });
    if (!confirmed) return;

    setIsResetting(true);
    try {
      await resetAllData(database);
      // Rows referencing the photos are gone, so the files must go too.
      await deleteAllItemImages();
      await cancelAllCooldownReminders();
      invalidate('settings', 'commitments', 'wishlist', 'purchases', 'usage', 'expenses');
      await updateSettings({ onboardingCompleted: false });
      router.replace('/onboarding');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <ScreenHeader title={t('settings.title')} onBack={goBack} />

      <Screen scroll>
        <SectionHeader title={t('settings.appearance.title')} />
        <Card padding={theme.spacing.md}>
          <SegmentedControl<ThemeMode>
            accessibilityLabel={t('settings.appearance.title')}
            options={[
              { value: 'system', label: t('settings.appearance.system') },
              { value: 'light', label: t('settings.appearance.light') },
              { value: 'dark', label: t('settings.appearance.dark') },
            ]}
            value={settings.themeMode}
            onChange={(mode) => void updateSettings({ themeMode: mode })}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
              marginTop: theme.spacing.sm,
            }}
          >
            {settings.themeMode === 'system' ? (
              <SunMoon
                size={theme.sizes.icon.sm}
                color={theme.colors.text.tertiary}
                strokeWidth={2}
              />
            ) : settings.themeMode === 'light' ? (
              <Sun size={theme.sizes.icon.sm} color={theme.colors.text.tertiary} strokeWidth={2} />
            ) : (
              <Moon size={theme.sizes.icon.sm} color={theme.colors.text.tertiary} strokeWidth={2} />
            )}
            <AppText variant="caption" color="tertiary">
              {settings.themeMode === 'system'
                ? t('settings.appearance.followingSystem')
                : settings.themeMode === 'light'
                  ? t('settings.appearance.alwaysLight')
                  : t('settings.appearance.alwaysDark')}
            </AppText>
          </View>
        </Card>

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title={t('settings.language.title')} />
        <Card padding={theme.spacing.md}>
          <ListRow
            leading={<IconTile icon={Globe} tint="blue" />}
            title={t('settings.language.row')}
            subtitle={
              settings.language === 'system'
                ? t('settings.language.system')
                : LANGUAGE_NATIVE_NAMES[resolveLanguage(settings.language)]
            }
            onPress={() => router.push('/settings/language')}
            showChevron
          />
        </Card>

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title={t('settings.currency.title')} />
        <Card padding={theme.spacing.md}>
          <ListRow
            leading={<IconTile icon={Coins} tint="amber" />}
            title={t('settings.currency.row')}
            subtitle={t(getCurrency(settings.currencyCode).nameKey)}
            onPress={() => router.push('/settings/currency')}
            showChevron
          />
        </Card>

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title={t('settings.notifications.title')} />
        <Card padding={theme.spacing.md}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <IconTile icon={Bell} tint="violet" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t('settings.notifications.remindersTitle')}</AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {t('settings.notifications.remindersSubtitle')}
              </AppText>
            </View>
            <Switch
              accessibilityLabel={t('settings.notifications.remindersTitle')}
              value={settings.cooldownRemindersEnabled}
              onValueChange={(value) => void handleRemindersToggle(value)}
              disabled={!areLocalNotificationsSupported()}
              trackColor={{ true: theme.colors.accent.base, false: theme.colors.borderStrong }}
            />
          </View>

          {remindersUnavailableFor ? (
            <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.sm }}>
              {remindersUnavailableFor === 'expo_go'
                ? t('settings.notifications.expoGo')
                : t('settings.notifications.platformUnavailable')}
            </AppText>
          ) : null}

          {notificationMessage ? (
            <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.sm }}>
              {notificationMessage}
            </AppText>
          ) : null}
        </Card>

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title={t('settings.money.title')} />
        <Card padding={theme.spacing.md}>
          <ListRow
            leading={<IconTile icon={Euro} tint="green" />}
            title={t('settings.money.rowTitle')}
            subtitle={t('settings.money.rowSubtitle')}
            onPress={() => router.push('/money')}
            showChevron
          />
        </Card>

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title={t('settings.privacy.title')} />
        <Card padding={theme.spacing.md}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <IconTile icon={Lock} tint="slate" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t('settings.privacy.heading')}</AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {t('settings.privacy.body')}
              </AppText>
            </View>
          </View>
        </Card>

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title={t('settings.data.title')} />
        <Card padding={theme.spacing.md}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <IconTile icon={Database} tint="blue" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t('settings.data.heading')}</AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {t('settings.data.schemaVersion', { version: LATEST_SCHEMA_VERSION })}
              </AppText>
            </View>
          </View>

          <View style={{ height: theme.spacing.md }} />

          <Button
            label={t('settings.data.reset')}
            icon={RotateCcw}
            variant="destructive"
            size="md"
            onPress={handleReset}
            loading={isResetting}
          />
        </Card>

        {isDevSeedAvailable() ? (
          <>
            <View style={{ height: theme.spacing.xl }} />
            <SectionHeader
              title={t('settings.development.title')}
              subtitle={t('settings.development.subtitle')}
            />
            <Card padding={theme.spacing.md}>
              <Button
                label={t('settings.development.seed')}
                variant="secondary"
                size="md"
                onPress={handleSeed}
                loading={isSeeding}
              />
              <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.xs }}>
                {t('settings.development.seedDescription')}
              </AppText>
            </Card>
          </>
        ) : null}

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title={t('settings.about.title')} />
        {/* The app version lives here; the schema version stays under Data, because
            they are different numbers about different things. */}
        <AboutCard version={appVersion()} />
      </Screen>
    </>
  );
}

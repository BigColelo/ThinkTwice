import { useRouter } from 'expo-router';
import { Bell, Database, Euro, Lock, Moon, RotateCcw, Sun, SunMoon } from 'lucide-react-native';
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
import { resetAllData } from '@/db/database';
import { useDatabase, useRepositories } from '@/db/DatabaseProvider';
import { invalidate } from '@/db/dataRevisions';
import { isDevSeedAvailable, seedDevelopmentData } from '@/db/devSeed';
import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { deleteAllItemImages } from '@/features/images/itemImages';
import { useGoBack } from '@/features/navigation/useGoBack';
import { appVersion } from '@/features/settings/appVersion';
import { AboutCard } from '@/features/settings/components/AboutCard';
import { useSettings } from '@/features/settings/SettingsProvider';
import {
  areLocalNotificationsSupported,
  cancelAllCooldownReminders,
  localNotificationsUnavailableReason,
  requestNotificationPermission,
  rescheduleAllCooldownReminders,
} from '@/notifications/cooldownNotifications';
import { useTheme } from '@/theme';
import type { CurrencyCode, ThemeMode } from '@/types/domain';
import { confirm } from '@/utils/confirm';
import { CURRENCY_LABELS, SUPPORTED_CURRENCIES } from '@/utils/currency';

/**
 * Appearance, currency, reminders, and the controls that let the user take
 * their data back — including deleting all of it.
 */
export default function SettingsScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
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
          ? `Reminders are on. ${scheduled} ${scheduled === 1 ? 'item' : 'items'} already waiting will remind you too.`
          : 'Reminders are on. New reflection periods will end with a reminder.',
      );
      return;
    }

    if (outcome === 'unsupported') {
      setNotificationMessage('Reminders are not available on this platform. Cooldowns still work.');
      return;
    }

    setNotificationMessage(
      'Notifications are turned off for ThinkTwice. You can enable them in your device settings — cooldowns work either way.',
    );
  };

  const handleReset = async (): Promise<void> => {
    const confirmed = await confirm({
      title: 'Delete all local data?',
      message:
        'Your income, commitments, wishlist, purchases, usage history and item photos will be permanently removed from this device. This cannot be undone.',
      confirmLabel: 'Delete everything',
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
      <ScreenHeader title="Settings" onBack={goBack} />

      <Screen scroll>
        <SectionHeader title="Appearance" />
        <Card padding={theme.spacing.md}>
          <SegmentedControl<ThemeMode>
            accessibilityLabel="Appearance"
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
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
                ? 'Following your device setting.'
                : `Always ${settings.themeMode}.`}
            </AppText>
          </View>
        </Card>

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title="Currency" />
        <Card padding={theme.spacing.md}>
          {/* A choice is offered only when there is one to make. Widening
              SUPPORTED_CURRENCIES brings the control back on its own. */}
          {SUPPORTED_CURRENCIES.length > 1 ? (
            <>
              <SegmentedControl<CurrencyCode>
                accessibilityLabel="Currency"
                options={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))}
                value={settings.currencyCode}
                onChange={(code) => void updateSettings({ currencyCode: code })}
                size="sm"
              />
              <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.sm }}>
                {`${CURRENCY_LABELS[settings.currencyCode]}. Amounts already entered are not converted — only how they are displayed changes.`}
              </AppText>
            </>
          ) : (
            <>
              <AppText variant="bodyStrong">{CURRENCY_LABELS[settings.currencyCode]}</AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                The only currency in this version.
              </AppText>
              <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.sm }}>
                Amounts are stored exactly as you enter them and are never converted, so another
                currency would relabel your figures rather than translate them.
              </AppText>
            </>
          )}
        </Card>

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title="Notifications" />
        <Card padding={theme.spacing.md}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <IconTile icon={Bell} tint="violet" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Reflection reminders</AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                A local reminder when a reflection period ends.
              </AppText>
            </View>
            <Switch
              accessibilityLabel="Reflection reminders"
              value={settings.cooldownRemindersEnabled}
              onValueChange={(value) => void handleRemindersToggle(value)}
              disabled={!areLocalNotificationsSupported()}
              trackColor={{ true: theme.colors.accent.base, false: theme.colors.borderStrong }}
            />
          </View>

          {remindersUnavailableFor ? (
            <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.sm }}>
              {remindersUnavailableFor === 'expo_go'
                ? 'Reminders need a development build — Expo Go cannot schedule them on Android. Reflection periods still end on time without them.'
                : 'Reminders are not available on this platform. Reflection periods still end on time without them.'}
            </AppText>
          ) : null}

          {notificationMessage ? (
            <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.sm }}>
              {notificationMessage}
            </AppText>
          ) : null}
        </Card>

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title="Money" />
        <Card padding={theme.spacing.md}>
          <ListRow
            leading={<IconTile icon={Euro} tint="green" />}
            title="Monthly financial setup"
            subtitle="Net income, savings target and recurring commitments"
            onPress={() => router.push('/money')}
            showChevron
          />
        </Card>

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title="Privacy" />
        <Card padding={theme.spacing.md}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <IconTile icon={Lock} tint="slate" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Everything stays on this device</AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                ThinkTwice has no account, no server and no analytics. Your income, commitments and
                purchases are stored in a local database and are never sent anywhere.
              </AppText>
            </View>
          </View>
        </Card>

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title="Data" />
        <Card padding={theme.spacing.md}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <IconTile icon={Database} tint="blue" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Local database</AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {`Schema version ${LATEST_SCHEMA_VERSION}. Deleting the app removes this data.`}
              </AppText>
            </View>
          </View>

          <View style={{ height: theme.spacing.md }} />

          <Button
            label="Reset all local data"
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
            <SectionHeader title="Development" subtitle="Only present in development builds." />
            <Card padding={theme.spacing.md}>
              <Button
                label="Load sample data"
                variant="secondary"
                size="md"
                onPress={handleSeed}
                loading={isSeeding}
              />
              <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.xs }}>
                Adds example income, commitments, wishlist items and purchases on top of what is
                already stored.
              </AppText>
            </Card>
          </>
        ) : null}

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title="About" />
        {/* The app version lives here; the schema version stays under Data, because
            they are different numbers about different things. */}
        <AboutCard version={appVersion()} />
      </Screen>
    </>
  );
}

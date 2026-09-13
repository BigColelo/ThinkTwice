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
import { Spacer } from '@/components/ui/Spacer';
import { getCurrency } from '@/constants/currencies';
import { useRepositories } from '@/db/DatabaseProvider';
import { isDevSeedAvailable, seedDevelopmentData } from '@/db/devSeed';
import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { useConfirm } from '@/features/dialogs/useConfirm';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useGoBack } from '@/features/navigation/useGoBack';
import { appVersion } from '@/features/settings/appVersion';
import { AboutCard } from '@/features/settings/components/AboutCard';
import { resetAllLocalData } from '@/features/settings/services/dataActions';
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

/**
 * Appearance, currency, reminders, and the controls that let the user take
 * their data back — including deleting all of it.
 */
export default function SettingsScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useAppRouter();
  const { settings, updateSettings, reloadSettings } = useSettings();
  const repositories = useRepositories();

  const confirm = useConfirm();

  const [appearanceError, setAppearanceError] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const goBack = useGoBack('/');

  // The switch is disabled where local scheduling does not exist; without a
  // reason next to it, a dead control is just confusing.
  const remindersUnavailableFor = localNotificationsUnavailableReason();

  const handleThemeChange = async (mode: ThemeMode): Promise<void> => {
    setAppearanceError(null);
    try {
      await updateSettings({ themeMode: mode });
    } catch {
      setAppearanceError(t('settings.saveError'));
    }
  };

  const handleSeed = async (): Promise<void> => {
    setIsSeeding(true);
    setSeedError(null);
    try {
      await seedDevelopmentData(repositories);
      // The seed writes settings straight through the repository, so the
      // provider's in-memory copy has to be re-read or the app would keep
      // showing the pre-seed income.
      await reloadSettings();
      router.replace('/');
    } catch {
      // Development only, so the generic message is enough.
      setSeedError(t('common.somethingWentWrong'));
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRemindersToggle = async (enabled: boolean): Promise<void> => {
    setNotificationMessage(null);

    try {
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

      setNotificationMessage(
        outcome === 'unsupported'
          ? t('settings.notifications.unsupported')
          : t('settings.notifications.denied'),
      );
    } catch {
      // The switch follows the stored value, so it already shows the truth; this
      // says why it did not move.
      setNotificationMessage(t('settings.saveError'));
    }
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
    setResetError(null);
    try {
      await resetAllLocalData(repositories);
      // The reset already cleared the row; the provider's copy has to catch up
      // with it, the same way it does after the development seed.
      await reloadSettings();
      router.replace('/onboarding');
    } catch {
      setResetError(t('settings.data.resetError'));
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
            onChange={(mode) => void handleThemeChange(mode)}
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
          {appearanceError ? (
            <AppText
              variant="caption"
              color="danger"
              accessibilityRole="alert"
              style={{ marginTop: theme.spacing.sm }}
            >
              {appearanceError}
            </AppText>
          ) : null}
        </Card>

        <Spacer size="xl" />
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

        <Spacer size="xl" />
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

        <Spacer size="xl" />
        <SectionHeader title={t('settings.notifications.title')} />
        <Card padding={theme.spacing.md}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <IconTile icon={Bell} tint="violet" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t('settings.notifications.remindersTitle')}</AppText>
              <AppText
                variant="caption"
                color="secondary"
                style={{ marginTop: theme.spacing.xxxs }}
              >
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

        <Spacer size="xl" />
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

        <Spacer size="xl" />
        <SectionHeader title={t('settings.privacy.title')} />
        <Card padding={theme.spacing.md}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <IconTile icon={Lock} tint="slate" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t('settings.privacy.heading')}</AppText>
              <AppText
                variant="caption"
                color="secondary"
                style={{ marginTop: theme.spacing.xxxs }}
              >
                {t('settings.privacy.body')}
              </AppText>
            </View>
          </View>
        </Card>

        <Spacer size="xl" />
        <SectionHeader title={t('settings.data.title')} />
        <Card padding={theme.spacing.md}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <IconTile icon={Database} tint="blue" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t('settings.data.heading')}</AppText>
              <AppText
                variant="caption"
                color="secondary"
                style={{ marginTop: theme.spacing.xxxs }}
              >
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
            loading={isResetting}
          />
          {resetError ? (
            <AppText
              variant="caption"
              color="danger"
              accessibilityRole="alert"
              style={{ marginTop: theme.spacing.sm }}
            >
              {resetError}
            </AppText>
          ) : null}
        </Card>

        {isDevSeedAvailable() ? (
          <>
            <Spacer size="xl" />
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
              {seedError ? (
                <AppText
                  variant="caption"
                  color="danger"
                  accessibilityRole="alert"
                  style={{ marginTop: theme.spacing.xs }}
                >
                  {seedError}
                </AppText>
              ) : null}
            </Card>
          </>
        ) : null}

        <Spacer size="xl" />
        <SectionHeader title={t('settings.about.title')} />
        {/* The app version lives here; the schema version stays under Data, because
            they are different numbers about different things. */}
        <AboutCard version={appVersion()} />
      </Screen>
    </>
  );
}

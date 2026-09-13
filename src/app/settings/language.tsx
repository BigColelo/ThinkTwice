import { Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ListRow, RowDivider } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useRepositories } from '@/db/DatabaseProvider';
import { useGoBack } from '@/features/navigation/useGoBack';
import { useSettings } from '@/features/settings/SettingsProvider';
import {
  applyLayoutDirection,
  isRtlLanguage,
  LANGUAGE_NATIVE_NAMES,
  resolveLanguage,
  SUPPORTED_LANGUAGES,
  useT,
} from '@/i18n';
import {
  areLocalNotificationsSupported,
  rescheduleAllCooldownReminders,
} from '@/notifications/cooldownNotifications';
import { useTheme } from '@/theme';
import type { LanguagePreference } from '@/types/domain';

/**
 * The language picker.
 *
 * Each language is named in itself — someone looking for Deutsch is not helped
 * by a list that says "German" in a language they do not read — so these labels
 * are the one place in the app that never goes through `t`.
 *
 * Two things happen alongside storing the choice. Pending reminders are
 * re-scheduled, because their text was frozen into the operating system when
 * they were created and a reflection period can run for months. And the layout
 * direction is recorded; on native it only takes effect after a restart, which
 * is what the notice below the list says.
 */
export default function LanguageScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const goBack = useGoBack('/settings');
  const { settings, updateSettings } = useSettings();
  const repositories = useRepositories();

  const [needsRestart, setNeedsRestart] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const select = async (preference: LanguagePreference): Promise<void> => {
    if (preference === settings.language) return;

    setSaveError(null);
    try {
      await updateSettings({ language: preference });
    } catch {
      setSaveError(t('settings.saveError'));
      return;
    }

    const language = resolveLanguage(preference);
    setNeedsRestart(applyLayoutDirection(language));

    // The reminder carries its copy from the moment it was scheduled, so the
    // pending ones are now in the previous language. This is the same reason an
    // edited item re-schedules its own. A reminder is a convenience: the language
    // is saved whether or not this part succeeds, so a failure here is not
    // reported as if the choice had been lost.
    if (settings.cooldownRemindersEnabled && areLocalNotificationsSupported()) {
      try {
        const openItems = await repositories.wishlist.listOpen();
        await rescheduleAllCooldownReminders(openItems);
      } catch {
        // See above: the pending reminders keep their previous language.
      }
    }
  };

  const options: readonly { value: LanguagePreference; label: string; detail?: string }[] = [
    {
      value: 'system',
      label: t('settings.language.system'),
      detail: t('settings.language.systemDetail'),
    },
    ...SUPPORTED_LANGUAGES.map((language) => ({
      value: language,
      label: LANGUAGE_NATIVE_NAMES[language],
    })),
  ];

  return (
    <>
      <ScreenHeader title={t('settings.language.title')} onBack={goBack} />

      <Screen scroll>
        <Card padding={theme.spacing.md}>
          {options.map((option, index) => (
            <View key={option.value}>
              {index > 0 ? <RowDivider /> : null}
              <ListRow
                title={option.label}
                subtitle={option.detail}
                // The tick is paired with `selected` state rather than carrying
                // the meaning on its own, so the row is announced as chosen.
                trailing={
                  option.value === settings.language ? (
                    <Check
                      size={theme.sizes.icon.md}
                      color={theme.colors.accent.base}
                      strokeWidth={theme.sizes.iconStrokeWidth}
                    />
                  ) : undefined
                }
                selected={option.value === settings.language}
                onPress={() => void select(option.value)}
              />
            </View>
          ))}
        </Card>

        <AppText variant="caption" color="tertiary" style={{ marginTop: theme.spacing.sm }}>
          {t('settings.language.description')}
        </AppText>

        {saveError ? (
          <AppText
            variant="caption"
            color="danger"
            accessibilityRole="alert"
            style={{ marginTop: theme.spacing.sm }}
          >
            {saveError}
          </AppText>
        ) : null}

        {needsRestart ? (
          <AppText
            variant="caption"
            color="warning"
            accessibilityRole="alert"
            style={{ marginTop: theme.spacing.sm }}
          >
            {isRtlLanguage(resolveLanguage(settings.language))
              ? t('settings.language.restartRequired')
              : t('settings.language.restartRequiredBack')}
          </AppText>
        ) : null}
      </Screen>
    </>
  );
}

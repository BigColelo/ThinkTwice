import { Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { InlineError } from '@/components/ui/InlineError';
import { ListRow, RowDivider } from '@/components/ui/ListRow';
import { useRepositories } from '@/db/DatabaseProvider';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import { refreshCooldownReminders } from '@/features/settings/services/reminderActions';
import { useSettings } from '@/features/settings/SettingsProvider';
import {
  applyLayoutDirection,
  isRtlLanguage,
  LANGUAGE_NATIVE_NAMES,
  resolveLanguage,
  SUPPORTED_LANGUAGES,
  useT,
} from '@/i18n';
import { useTheme } from '@/theme';
import type { LanguageCode, LanguagePreference } from '@/types/domain';

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
export function LanguageSelection(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const repositories = useRepositories();
  const { settings, updateSettings } = useSettings();
  const save = useAsyncAction();
  // The language whose layout direction only a restart can apply, if any.
  const [restartFor, setRestartFor] = useState<LanguageCode | null>(null);

  const select = async (preference: LanguagePreference): Promise<void> => {
    if (preference === settings.language) return;

    const saved = await save.run(() => updateSettings({ language: preference }), {
      errorMessage: t('settings.saveError'),
    });
    if (!saved) return;

    const language = resolveLanguage(preference);
    setRestartFor(applyLayoutDirection(language) ? language : null);

    // Awaited only after the save, so the reminders are rebuilt in the language
    // just applied. A reminder is a convenience: the language is saved whether
    // or not this part succeeds, so a failure here is not reported as if the
    // choice had been lost — the pending reminders keep their previous words.
    await refreshCooldownReminders(repositories).catch(() => undefined);
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

      <InlineError message={save.error} spaceAbove="sm" />

      {restartFor ? (
        <AppText
          variant="caption"
          color="warning"
          accessibilityRole="alert"
          style={{ marginTop: theme.spacing.sm }}
        >
          {isRtlLanguage(restartFor)
            ? t('settings.language.restartRequired')
            : t('settings.language.restartRequiredBack')}
        </AppText>
      ) : null}
    </>
  );
}

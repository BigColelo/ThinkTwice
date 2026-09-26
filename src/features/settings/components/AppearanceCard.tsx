import { Moon, Sun, SunMoon } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { InlineError } from '@/components/ui/InlineError';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { THEME_MODES } from '@/constants/enums';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useT, type TranslationKey } from '@/i18n';
import { useTheme } from '@/theme';
import type { ThemeMode } from '@/types/domain';

/**
 * Light, dark, or whatever the device says — and, under the control, what the
 * choice means in words, so "System" is not left for the user to interpret.
 *
 * The write is the setting itself, so it goes straight through the provider;
 * the new theme is visible the moment it is stored.
 */

const MODE_ICONS = { system: SunMoon, light: Sun, dark: Moon } as const;

const MODE_DESCRIPTIONS: Record<ThemeMode, TranslationKey> = {
  system: 'settings.appearance.followingSystem',
  light: 'settings.appearance.alwaysLight',
  dark: 'settings.appearance.alwaysDark',
};

export function AppearanceCard(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const { settings, updateSettings } = useSettings();
  const save = useAsyncAction();

  const mode = settings.themeMode;
  const ModeIcon = MODE_ICONS[mode];

  const choose = (next: ThemeMode): void => {
    void save.run(() => updateSettings({ themeMode: next }), {
      errorMessage: t('settings.saveError'),
    });
  };

  return (
    <Card padding={theme.spacing.md}>
      <SegmentedControl<ThemeMode>
        accessibilityLabel={t('settings.appearance.title')}
        options={THEME_MODES.map((value) => ({
          value,
          label: t(`settings.appearance.${value}`),
        }))}
        value={mode}
        onChange={choose}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          marginTop: theme.spacing.sm,
        }}
      >
        <ModeIcon
          size={theme.sizes.icon.sm}
          color={theme.colors.text.tertiary}
          strokeWidth={theme.sizes.iconStrokeWidth}
        />
        <AppText variant="caption" color="tertiary">
          {t(MODE_DESCRIPTIONS[mode])}
        </AppText>
      </View>
      <InlineError message={save.error} spaceAbove="sm" />
    </Card>
  );
}

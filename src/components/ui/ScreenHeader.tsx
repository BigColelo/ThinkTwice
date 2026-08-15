import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';

import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { IconButton } from './IconButton';

/**
 * The header used across secondary screens: an optional back control, a centred
 * title, and up to one trailing action. Kept in one component so every screen
 * has the same height, alignment and safe-area handling.
 */

export type ScreenHeaderProps = {
  title?: string;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  /** Trailing icon action, e.g. the settings gear or an overflow menu. */
  action?: {
    icon: LucideIcon;
    accessibilityLabel: string;
    onPress: () => void;
  };
  /** Trailing text action, e.g. "Close". Ignored when `action` is set. */
  textAction?: {
    label: string;
    onPress: () => void;
  };
  /** Leading icon action shown instead of the back chevron. */
  leadingAction?: {
    icon: LucideIcon;
    accessibilityLabel: string;
    onPress: () => void;
  };
  /** Draws a hairline under the header — used when content scrolls beneath it. */
  bordered?: boolean;
};

export function ScreenHeader({
  title,
  onBack,
  backAccessibilityLabel,
  action,
  textAction,
  leadingAction,
  bordered = false,
}: ScreenHeaderProps): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <View
      style={{
        // The accent strip at the root owns the top inset; the header starts below it.
        backgroundColor: theme.colors.background,
        borderBottomWidth: bordered ? theme.sizes.hairline : 0,
        borderBottomColor: theme.colors.divider,
      }}
    >
      <View
        style={{
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.sm,
        }}
      >
        {/* Fixed-width side slots keep the title optically centred regardless
            of how wide the actions are. */}
        <View style={{ width: 72, alignItems: 'flex-start' }}>
          {leadingAction ? (
            <IconButton
              icon={leadingAction.icon}
              accessibilityLabel={leadingAction.accessibilityLabel}
              onPress={leadingAction.onPress}
            />
          ) : onBack ? (
            <IconButton
              icon={ChevronLeft}
              accessibilityLabel={backAccessibilityLabel ?? t('common.back')}
              onPress={onBack}
            />
          ) : null}
        </View>

        <View style={{ flex: 1, alignItems: 'center' }}>
          {title ? (
            <AppText variant="heading" numberOfLines={1} accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
        </View>

        <View style={{ width: 72, alignItems: 'flex-end' }}>
          {action ? (
            <IconButton
              icon={action.icon}
              accessibilityLabel={action.accessibilityLabel}
              onPress={action.onPress}
            />
          ) : textAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={textAction.label}
              onPress={textAction.onPress}
              hitSlop={theme.spacing.sm}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <AppText variant="label" color="secondary">
                {textAction.label}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

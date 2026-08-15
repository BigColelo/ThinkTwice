import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

/**
 * The repeated row shape across the app: leading visual, title with optional
 * supporting line, trailing value, optional chevron.
 *
 * When pressable, the whole row is a single accessibility element with a
 * composed label, so a screen reader announces "Rent, €600 per month" rather
 * than three disconnected fragments.
 */

export type ListRowProps = {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Rendered on the right — usually a `MoneyValue`. */
  trailing?: React.ReactNode;
  /** Secondary line under `trailing`. Strings get the standard caption styling. */
  trailingSubtitle?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  /**
   * Marks the row as one option among several, e.g. in the language picker.
   * Announced as a selected radio rather than as a button, so the state does not
   * rest on a tick mark alone.
   */
  selected?: boolean;
  /** Screen-reader label; defaults to title + subtitle. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  trailingSubtitle,
  onPress,
  showChevron = false,
  selected,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ListRowProps): React.ReactElement {
  const theme = useTheme();

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          minHeight: theme.sizes.minTouchTarget,
          paddingVertical: theme.spacing.xs,
        },
        style,
      ]}
    >
      {leading}

      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="secondary" numberOfLines={1} style={{ marginTop: 1 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {trailing || trailingSubtitle ? (
        <View style={{ alignItems: 'flex-end' }}>
          {trailing}
          {typeof trailingSubtitle === 'string' ? (
            <AppText variant="caption" color="secondary" style={{ marginTop: 1 }}>
              {trailingSubtitle}
            </AppText>
          ) : (
            trailingSubtitle
          )}
        </View>
      ) : null}

      {showChevron ? (
        <ChevronRight
          size={theme.sizes.icon.md}
          color={theme.colors.text.tertiary}
          strokeWidth={theme.sizes.iconStrokeWidth}
        />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      testID={testID}
      accessibilityRole={selected === undefined ? 'button' : 'radio'}
      accessibilityState={selected === undefined ? undefined : { selected }}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
    >
      {content}
    </Pressable>
  );
}

/** Hairline separator matching the row gutter. */
export function RowDivider(): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      style={{
        height: theme.sizes.hairline,
        backgroundColor: theme.colors.divider,
        marginVertical: theme.spacing.xxs,
      }}
    />
  );
}

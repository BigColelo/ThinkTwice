import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type TintName } from '@/theme';

import { AppText } from './AppText';

/**
 * A small pill: category labels, expected-usage summaries, "Owned for 8 months",
 * and selectable filter chips.
 */

export type ChipTone = 'neutral' | 'accent' | 'positive' | 'warning' | 'danger' | 'info';

export type ChipProps = {
  label: string;
  icon?: LucideIcon;
  tone?: ChipTone;
  /** Overrides `tone` with a category tint. */
  tint?: TintName;
  size?: 'sm' | 'md';
  /** Renders the chip as a toggle. Sets the selected accessibility state. */
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  icon: Icon,
  tone = 'neutral',
  tint,
  size = 'md',
  onPress,
  selected,
  style,
}: ChipProps): React.ReactElement {
  const theme = useTheme();

  const tintColors = tint ? theme.tint(tint) : null;
  const toneColors = resolveTone(theme, tone);

  const background = selected
    ? theme.colors.accent.base
    : (tintColors?.soft ?? toneColors.background);
  const foreground = selected
    ? theme.colors.text.onAccent
    : (tintColors?.base ?? toneColors.foreground);

  const iconSize = size === 'sm' ? theme.sizes.icon.xs : theme.sizes.icon.sm;
  const isInteractive = onPress != null;

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.xxs + 2,
          alignSelf: 'flex-start',
          paddingHorizontal: size === 'sm' ? theme.spacing.xs : theme.spacing.sm,
          paddingVertical: size === 'sm' ? 4 : 6,
          // A chip that can be pressed is a touch target and grows to reach the
          // app's minimum with its `hitSlop`; one that only labels something stays
          // compact, because nothing is aiming at it. Real height rather than a
          // larger invisible halo: with 8pt between chips, slops that big would
          // overlap and hand a tap to the neighbour.
          minHeight: isInteractive ? theme.sizes.control.sm : undefined,
          borderRadius: theme.radius.full,
          backgroundColor: background,
        },
        style,
      ]}
    >
      {Icon ? (
        <Icon size={iconSize} color={foreground} strokeWidth={theme.sizes.iconStrokeWidth} />
      ) : null}
      <AppText variant={size === 'sm' ? 'caption' : 'label'} style={{ color: foreground }}>
        {label}
      </AppText>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      // Closes the gap between the chip's own height and `minTouchTarget`.
      hitSlop={Math.max(0, (theme.sizes.minTouchTarget - theme.sizes.control.sm) / 2)}
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
    >
      {content}
    </Pressable>
  );
}

function resolveTone(
  theme: ReturnType<typeof useTheme>,
  tone: ChipTone,
): { background: string; foreground: string } {
  switch (tone) {
    case 'neutral':
      return { background: theme.colors.surfaceMuted, foreground: theme.colors.text.secondary };
    case 'accent':
      return { background: theme.colors.accent.soft, foreground: theme.colors.accent.onSoft };
    case 'positive':
      return { background: theme.colors.positive.soft, foreground: theme.colors.positive.onSoft };
    case 'warning':
      return { background: theme.colors.warning.soft, foreground: theme.colors.warning.onSoft };
    case 'danger':
      return { background: theme.colors.danger.soft, foreground: theme.colors.danger.onSoft };
    case 'info':
      return { background: theme.colors.info.soft, foreground: theme.colors.info.onSoft };
  }
}

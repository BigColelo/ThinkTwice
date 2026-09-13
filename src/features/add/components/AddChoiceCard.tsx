import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableCard } from '@/components/ui/Card';
import { useTheme } from '@/theme';

/**
 * One of the two answers to the only question the add flow asks: is this
 * something you want to buy, or something you already own?
 *
 * The distinction decides which half of the app the item belongs to and cannot
 * be changed afterwards by editing, so both answers are full cards with a
 * sentence of explanation rather than two words in a segmented control. The
 * description is the accessibility hint as well as the visible copy — it is the
 * part that actually distinguishes them.
 */

export function AddChoiceCard({
  icon: Icon,
  title,
  description,
  onPress,
  highlighted = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onPress: () => void;
  /** Marks the answer the flow expects most often. */
  highlighted?: boolean;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <PressableCard
      variant={highlighted ? 'accent' : 'surface'}
      onPress={onPress}
      padding={theme.spacing.md}
      accessibilityLabel={title}
      accessibilityHint={description}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: highlighted ? theme.colors.surface : theme.colors.surfaceMuted,
          }}
        >
          <Icon
            size={theme.sizes.icon.lg}
            color={highlighted ? theme.colors.accent.base : theme.colors.text.secondary}
            strokeWidth={theme.sizes.iconStrokeWidth}
          />
        </View>

        <View style={{ flex: 1 }}>
          <AppText variant="subheading">{title}</AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.xxxs }}>
            {description}
          </AppText>
        </View>
      </View>
    </PressableCard>
  );
}

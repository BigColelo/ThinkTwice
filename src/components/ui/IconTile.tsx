import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type TintName } from '@/theme';

/**
 * The rounded, tinted square behind a category icon — used in commitment rows,
 * category breakdowns and purchase lists.
 */

export type IconTileProps = {
  icon: LucideIcon;
  tint: TintName;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
};

export function IconTile({
  icon: Icon,
  tint,
  size = 'md',
  style,
}: IconTileProps): React.ReactElement {
  const theme = useTheme();
  const box = theme.sizes.iconTile[size];
  const colors = theme.tint(tint);

  return (
    <View
      // Decorative: the adjacent label always carries the meaning.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: box,
          height: box,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.soft,
        },
        style,
      ]}
    >
      <Icon
        size={size === 'sm' ? theme.sizes.icon.sm : theme.sizes.icon.md}
        color={colors.base}
        strokeWidth={theme.sizes.iconStrokeWidth}
      />
    </View>
  );
}

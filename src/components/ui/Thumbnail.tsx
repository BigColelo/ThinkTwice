import { Image } from 'expo-image';
import type { LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type TintName } from '@/theme';

/**
 * Product image with a category-icon fallback.
 *
 * Images are optional throughout ThinkTwice, and a stored URI can stop
 * resolving (the file was removed, or a picker URI did not survive a restart).
 * Both cases render the fallback rather than a broken frame.
 */

export type ThumbnailProps = {
  uri: string | null | undefined;
  fallbackIcon: LucideIcon;
  tint: TintName;
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Set on the frame; the photo inside it gets `${testID}-image`. */
  testID?: string;
};

export function Thumbnail({
  uri,
  fallbackIcon: FallbackIcon,
  tint,
  size,
  radius,
  style,
  testID,
}: ThumbnailProps): React.ReactElement {
  const theme = useTheme();
  const [hasFailed, setHasFailed] = useState(false);

  const box = size ?? theme.sizes.thumbnail.md;
  const borderRadius = radius ?? theme.radius.md;
  const colors = theme.tint(tint);

  const containerStyle: ViewStyle = {
    width: box,
    height: box,
    borderRadius,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.soft,
  };

  if (!uri || hasFailed) {
    return (
      <View
        testID={testID}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[containerStyle, style]}
      >
        <FallbackIcon
          size={Math.round(box * 0.42)}
          color={colors.base}
          strokeWidth={theme.sizes.iconStrokeWidth}
        />
      </View>
    );
  }

  return (
    <View testID={testID} style={[containerStyle, style]}>
      <Image
        testID={testID ? `${testID}-image` : undefined}
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={150}
        onError={() => setHasFailed(true)}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

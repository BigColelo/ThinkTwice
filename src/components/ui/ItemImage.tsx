import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * The photo at the top of an item's detail screen.
 *
 * A stored URI can stop resolving — the file was removed from the device, a
 * backup came back without the documents directory, a picker URI from an older
 * build never survived a restart. When that happens the band **collapses** rather
 * than holding two hundred points of empty space: an item whose photo cannot be
 * shown then looks exactly like an item without one, which is the truth. Nothing
 * is lost, because the hero never carried information beyond the photo itself —
 * the category is a chip further down.
 *
 * Lists use `Thumbnail` instead, which keeps its square and falls back to the
 * category icon, because collapsing would break the row it sits in.
 */

export type ItemImageProps = {
  uri: string | null | undefined;
  /** Height of the band. */
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ItemImage({
  uri,
  height = 200,
  style,
  testID,
}: ItemImageProps): React.ReactElement | null {
  const theme = useTheme();
  const [hasFailed, setHasFailed] = useState(false);

  if (!uri || hasFailed) return null;

  return (
    <View
      style={[
        {
          height,
          borderRadius: theme.radius.xl,
          backgroundColor: theme.colors.surfaceSunken,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        testID={testID}
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        // `contain` rather than `cover`: a product photo cropped by the frame is
        // worse than one with space around it.
        contentFit="contain"
        transition={150}
        onError={() => setHasFailed(true)}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

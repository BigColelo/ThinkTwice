import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';
import type { WishlistItem } from '@/types/domain';

import { WishlistCard } from './WishlistCard';

/** Wishlist items as a stack of cards, the way Home and the full list both show them. */
export function WishlistCardList({
  items,
  onSelect,
}: {
  items: readonly WishlistItem[];
  onSelect: (item: WishlistItem) => void;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {items.map((item) => (
        <WishlistCard key={item.id} item={item} onPress={() => onSelect(item)} />
      ))}
    </View>
  );
}

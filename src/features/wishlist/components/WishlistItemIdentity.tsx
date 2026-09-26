import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { ItemImage } from '@/components/ui/ItemImage';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { getPurchaseCategory } from '@/constants/categories';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { WishlistItem } from '@/types/domain';

/**
 * What the item is: photo, name, price and category — the facts the reflection
 * below is about, before any figure is put next to them.
 */
export function WishlistItemIdentity({ item }: { item: WishlistItem }): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const category = getPurchaseCategory(item.categoryId);

  return (
    <>
      <ItemImage uri={item.imageUri} height={220} style={{ marginBottom: theme.spacing.md }} />

      <AppText variant="title">{item.name}</AppText>
      <MoneyValue
        cents={item.priceCents}
        variant="metric"
        style={{ marginTop: theme.spacing.xxs }}
      />
      <View style={{ flexDirection: 'row', marginTop: theme.spacing.xs }}>
        <Chip label={t(category.labelKey)} icon={category.icon} tint={category.tint} />
      </View>
    </>
  );
}

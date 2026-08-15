import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { ItemImage } from '@/components/ui/ItemImage';
import { getPurchaseCategory } from '@/constants/categories';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Purchase } from '@/types/domain';
import { formatDate } from '@/utils/dates';

/**
 * What the item is: photo, name, category, how long it has been owned.
 *
 * Memoised because the screen re-renders whenever a sheet opens or closes, and
 * none of that touches these figures.
 */

export const PurchaseIdentity = React.memo(function PurchaseIdentity({
  purchase,
  ownedFor,
}: {
  purchase: Purchase;
  /** `8 months`, already in words. `null` for a date that cannot be read. */
  ownedFor: string | null;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const category = getPurchaseCategory(purchase.categoryId);

  return (
    <>
      <ItemImage uri={purchase.imageUri} height={200} style={{ marginBottom: theme.spacing.md }} />

      <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
        <AppText variant="title" align="center">
          {purchase.name}
        </AppText>
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.xs,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Chip label={t(category.labelKey)} icon={category.icon} tint={category.tint} />
          {ownedFor ? <Chip label={t('purchases.ownedFor', { duration: ownedFor })} /> : null}
        </View>
        <AppText variant="caption" color="tertiary">
          {t('purchases.boughtOn', { date: formatDate(purchase.purchaseDate) })}
        </AppText>
      </View>
    </>
  );
});

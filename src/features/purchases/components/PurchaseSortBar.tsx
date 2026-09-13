import React from 'react';
import { View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Spacer } from '@/components/ui/Spacer';
import { PURCHASE_SORTS, type PurchaseSort } from '@/db/repositories';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * How the purchase list is ordered.
 *
 * The order is applied in SQL, so these are the repository's own sorts rather
 * than a second list that could disagree with it. Below two items there is
 * nothing to reorder, and the bar takes the space of the gap it would have left
 * instead of disappearing and moving the first row up.
 */

export function PurchaseSortBar({
  sort,
  onChange,
  count,
}: {
  sort: PurchaseSort;
  onChange: (sort: PurchaseSort) => void;
  /** How many items are in the list. */
  count: number;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  if (count < 2) return <Spacer size="xs" />;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('purchases.sort.label')}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        paddingBottom: theme.spacing.sm,
      }}
    >
      {PURCHASE_SORTS.map((option) => (
        <Chip
          key={option}
          label={t(`purchases.sort.${option}`)}
          size="sm"
          selected={option === sort}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  );
}

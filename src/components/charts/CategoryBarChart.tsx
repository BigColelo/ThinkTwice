import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconTile } from '@/components/ui/IconTile';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { getPurchaseCategory } from '@/constants/categories';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Cents, CategoryId } from '@/types/domain';
import { clamp } from '@/utils/numbers';

/**
 * Spending by category: an icon, a label, an amount and a proportional bar.
 *
 * The bar is scaled against the largest entry rather than the total, so small
 * categories stay visible instead of collapsing into a sliver. The amount is
 * always printed, so the chart is readable without interpreting bar lengths.
 */

export type CategoryBarChartItem = {
  categoryId: CategoryId;
  totalCents: Cents;
};

export type CategoryBarChartProps = {
  items: readonly CategoryBarChartItem[];
  /** Caps how many rows are shown; the rest are summed into "Other categories". */
  maxRows?: number;
  style?: StyleProp<ViewStyle>;
};

export function CategoryBarChart({
  items,
  maxRows = 6,
  style,
}: CategoryBarChartProps): React.ReactElement | null {
  const theme = useTheme();
  const t = useT();

  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => b.totalCents - a.totalCents);
  const visible = sorted.slice(0, maxRows);
  const remainder = sorted.slice(maxRows);

  const rows =
    remainder.length > 0
      ? [
          ...visible,
          {
            categoryId: 'other',
            totalCents: remainder.reduce((total, item) => total + item.totalCents, 0),
          },
        ]
      : visible;

  const largest = rows.reduce((max, item) => Math.max(max, item.totalCents), 0);

  return (
    <View style={[{ gap: theme.spacing.sm }, style]}>
      {rows.map((item, index) => {
        const category = getPurchaseCategory(item.categoryId);
        const tint = theme.tint(category.tint);
        const fraction = largest > 0 ? clamp(item.totalCents / largest, 0, 1) : 0;

        // Grouped without an explicit accessibilityLabel: React Native then
        // composes one from the children, so the amount is announced too. An
        // explicit label would replace it with just the category name.
        return (
          <View key={`${item.categoryId}-${index}`} accessible style={{ gap: theme.spacing.xxs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <IconTile icon={category.icon} tint={category.tint} size="sm" />
              <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {t(category.labelKey)}
              </AppText>
              <MoneyValue cents={item.totalCents} variant="bodyStrong" />
            </View>

            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                height: 6,
                borderRadius: theme.radius.full,
                backgroundColor: theme.colors.surfaceMuted,
                overflow: 'hidden',
                // Logical rather than `marginLeft`: under a right-to-left
                // language the bar has to line up with the label on the right.
                marginStart: theme.sizes.iconTile.sm + theme.spacing.sm,
              }}
            >
              <View
                style={{
                  width: `${fraction * 100}%`,
                  height: '100%',
                  borderRadius: theme.radius.full,
                  backgroundColor: tint.base,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

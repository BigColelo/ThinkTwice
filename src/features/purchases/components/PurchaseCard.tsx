import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableCard } from '@/components/ui/Card';
import { CostPerUse, MoneyValue } from '@/components/ui/MoneyValue';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { getPurchaseCategory } from '@/constants/categories';
import { calculatePurchaseMetrics } from '@/domain';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { PurchaseWithStats } from '@/types/domain';
import { formatDate } from '@/utils/dates';

/**
 * An owned item in a list. Cost per use is the headline, because it is the
 * figure that says something the price alone does not.
 */

export function PurchaseCard({
  purchase,
  onPress,
}: {
  purchase: PurchaseWithStats;
  onPress: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const category = getPurchaseCategory(purchase.categoryId);
  const metrics = calculatePurchaseMetrics(purchase);

  const uses =
    metrics.totalUses > 0
      ? t('units.use', { count: metrics.totalUses })
      : t('purchases.noUsesRecorded');

  return (
    <PressableCard
      onPress={onPress}
      padding={theme.spacing.sm}
      accessibilityLabel={t('purchases.cardLabel', {
        name: purchase.name,
        category: t(category.labelKey),
        uses: t('units.use', { count: metrics.totalUses }),
      })}
      accessibilityHint={t('purchases.openHint')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Thumbnail
          uri={purchase.imageUri}
          fallbackIcon={category.icon}
          tint={category.tint}
          size={theme.sizes.thumbnail.md}
        />

        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {purchase.name}
          </AppText>
          <AppText variant="caption" color="secondary">
            {`${uses}${t('common.dotSeparator')}${t(category.labelKey)}`}
          </AppText>
          {/* What was paid and when: two of the sort orders are based on these, so
              a row that hid them would rank items by figures it never showed. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }}>
            <MoneyValue cents={purchase.purchasePriceCents} variant="caption" color="tertiary" />
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {`· ${formatDate(purchase.purchaseDate)}`}
            </AppText>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <CostPerUse
            cents={metrics.realCostPerUseCents}
            variant="bodyStrong"
            placeholder={t('purchases.noUsageYet')}
          />
        </View>

        <ChevronRight
          size={theme.sizes.icon.md}
          color={theme.colors.text.tertiary}
          strokeWidth={theme.sizes.iconStrokeWidth}
        />
      </View>
    </PressableCard>
  );
}

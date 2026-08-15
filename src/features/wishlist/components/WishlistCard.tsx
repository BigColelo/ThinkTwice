import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableCard } from '@/components/ui/Card';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { getPurchaseCategory } from '@/constants/categories';
import { calculateCooldownState, cooldownRemaining } from '@/domain';
import { cooldownRemainingShortText } from '@/features/wishlist/cooldownText';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { WishlistItem } from '@/types/domain';

/**
 * A wishlist item in a list: what it is, what it costs, and how much of the
 * reflection period is left.
 */

export function WishlistCard({
  item,
  onPress,
}: {
  item: WishlistItem;
  onPress: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const category = getPurchaseCategory(item.categoryId);
  const cooldown = calculateCooldownState(item);
  const remaining = cooldownRemainingShortText(t, cooldownRemaining(cooldown));

  return (
    <PressableCard
      onPress={onPress}
      padding={theme.spacing.sm}
      accessibilityLabel={`${item.name}${t('common.listSeparator')}${remaining}`}
      accessibilityHint={t('wishlist.openItemHint')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Thumbnail
          uri={item.imageUri}
          fallbackIcon={category.icon}
          tint={category.tint}
          size={theme.sizes.thumbnail.md}
        />

        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {item.name}
          </AppText>
          <MoneyValue cents={item.priceCents} variant="body" color="secondary" />
          <AppText variant="caption" color={cooldown.isComplete ? 'positive' : 'accent'}>
            {remaining}
          </AppText>
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

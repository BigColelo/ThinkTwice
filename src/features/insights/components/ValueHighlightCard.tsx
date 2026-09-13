import { TrendingDown, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableCard } from '@/components/ui/Card';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { getPurchaseCategory } from '@/constants/categories';
import type { ValueHighlight } from '@/domain';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * One end of the cost-per-use range: the item that has cost the least per use,
 * or the most.
 *
 * The label says which end it is and the arrow only repeats it, because neither
 * end is a verdict — a high cost per use is a thing bought recently as often as
 * a thing regretted, and the app does not know which. That is also why the two
 * are shown together or not at all: a single card would read as a judgement on
 * the one item it named.
 */

export function ValueHighlightCard({
  label,
  highlight,
  tone,
  onPress,
}: {
  /** Names which end this is, e.g. "Lowest cost per use". */
  label: string;
  highlight: ValueHighlight;
  tone: 'positive' | 'warning';
  onPress: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const category = getPurchaseCategory(highlight.categoryId);
  const accent = tone === 'positive' ? theme.colors.positive : theme.colors.warning;
  const Icon = tone === 'positive' ? TrendingDown : TrendingUp;

  return (
    <PressableCard
      onPress={onPress}
      padding={theme.spacing.sm}
      accessibilityLabel={t('insights.highlightLabel', { label, name: highlight.name })}
      accessibilityHint={t('purchases.openHint')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Thumbnail
          uri={highlight.imageUri}
          fallbackIcon={category.icon}
          tint={category.tint}
          size={theme.sizes.thumbnail.md}
        />
        <View style={{ flex: 1, gap: theme.spacing.xxxs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }}>
            <Icon size={theme.sizes.icon.xs} color={accent.base} strokeWidth={2.4} />
            <AppText variant="caption" style={{ color: accent.base }}>
              {label}
            </AppText>
          </View>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {highlight.name}
          </AppText>
          <AppText variant="caption" color="secondary">
            {t('units.use', { count: highlight.totalUses })}
          </AppText>
        </View>
        <MoneyValue
          cents={highlight.costPerUseCents}
          variant="bodyStrong"
          decimals="always"
          suffix={` ${t('units.perUse')}`}
        />
      </View>
    </PressableCard>
  );
}

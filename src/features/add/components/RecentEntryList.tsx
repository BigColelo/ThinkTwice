import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableCard } from '@/components/ui/Card';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { getPurchaseCategory } from '@/constants/categories';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import type { RecentEntry } from '../recentEntries';

/**
 * The recent items under the add question, one compact row each, saying which
 * half of the app the item is in. A row is content rather than a step of the
 * flow, so where it leads is the caller's to decide.
 */
export function RecentEntryList({
  entries,
  onSelect,
}: {
  entries: readonly RecentEntry[];
  onSelect: (entry: RecentEntry) => void;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {entries.map((entry) => {
        const category = getPurchaseCategory(entry.categoryId);
        const caption =
          entry.kind === 'thinking' ? t('add.thinkingCaption') : t('add.ownedCaption');

        return (
          <PressableCard
            key={entry.key}
            padding={theme.spacing.sm}
            onPress={() => onSelect(entry)}
            accessibilityLabel={t('add.entryLabel', { name: entry.name, caption })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Thumbnail
                uri={entry.imageUri}
                fallbackIcon={category.icon}
                tint={category.tint}
                size={theme.sizes.thumbnail.sm}
              />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {entry.name}
                </AppText>
                <AppText variant="caption" color="secondary">
                  {caption}
                </AppText>
              </View>
              <MoneyValue cents={entry.cents} variant="body" color="secondary" />
            </View>
          </PressableCard>
        );
      })}
    </View>
  );
}

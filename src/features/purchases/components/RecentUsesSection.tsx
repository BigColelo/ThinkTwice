import React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { UsageEvent } from '@/types/domain';
import { confirm } from '@/utils/confirm';
import { formatDateTime } from '@/utils/dates';

/**
 * The last few recorded uses, each removable.
 *
 * The usage card's undo covers the tap just made; this covers the one noticed
 * hours later, which is what keeps a count kept for years worth keeping. The
 * confirmation lives here, next to the list it acts on, and the removal itself
 * is the caller's — this section never writes.
 */

export const RecentUsesSection = React.memo(function RecentUsesSection({
  uses,
  limit,
  onRemove,
}: {
  uses: readonly UsageEvent[];
  /** How many the caller asked for, so a full list can say it is not the whole story. */
  limit: number;
  onRemove: (use: UsageEvent) => Promise<void>;
}): React.ReactElement | null {
  const theme = useTheme();
  const t = useT();

  if (uses.length === 0) return null;

  const remove = async (use: UsageEvent): Promise<void> => {
    const confirmed = await confirm({
      title: t('purchases.recentUses.removeTitle'),
      message: t('purchases.recentUses.removeMessage'),
      confirmLabel: t('purchases.recentUses.removeConfirm'),
      destructive: true,
    });
    if (confirmed) await onRemove(use);
  };

  return (
    <>
      <SectionHeader
        title={t('purchases.recentUses.title')}
        subtitle={
          uses.length === limit
            ? t('purchases.recentUses.subtitleLimited', { limit })
            : t('purchases.recentUses.subtitle')
        }
      />
      <Card padding={theme.spacing.md}>
        {uses.map((use, index) => (
          <View key={use.id}>
            {index > 0 ? (
              <View
                style={{
                  height: theme.sizes.hairline,
                  backgroundColor: theme.colors.divider,
                  marginVertical: theme.spacing.xxs,
                }}
              />
            ) : null}
            <ListRow
              title={formatDateTime(use.occurredAt)}
              subtitle={use.count > 1 ? t('units.use', { count: use.count }) : undefined}
              onPress={() => void remove(use)}
              accessibilityHint={t('purchases.recentUses.rowHint')}
            />
          </View>
        ))}
      </Card>
    </>
  );
});

import React from 'react';
import { View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { isDecided, type CooldownState } from '@/domain';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { WishlistItem } from '@/types/domain';

import { CooldownCard } from './CooldownCard';

/**
 * Where the item is in its life: still being thought about, with the time the
 * user agreed to wait, or decided one way or the other.
 *
 * A decision is stated with the same weight either way — bought is not a win and
 * dismissed is not a loss — which is why only the tone of the chip differs.
 */
export function WishlistItemStatus({
  item,
  cooldown,
}: {
  item: Pick<WishlistItem, 'status' | 'cooldownDays'>;
  /** `null` when the period's dates cannot be read; nothing is shown then. */
  cooldown: CooldownState | null;
}): React.ReactElement | null {
  const theme = useTheme();
  const t = useT();

  if (isDecided(item.status)) {
    return (
      <View style={{ marginTop: theme.spacing.md }}>
        <Chip
          label={item.status === 'purchased' ? t('wishlist.boughtIt') : t('wishlist.dismissedIt')}
          tone={item.status === 'purchased' ? 'positive' : 'neutral'}
        />
      </View>
    );
  }

  if (!cooldown) return null;

  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <CooldownCard state={cooldown} cooldownDays={item.cooldownDays} />
    </View>
  );
}

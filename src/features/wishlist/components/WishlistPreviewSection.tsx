import { Clock } from 'lucide-react-native';
import React from 'react';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingState } from '@/components/ui/StateViews';
import { useT } from '@/i18n';
import type { WishlistItem } from '@/types/domain';

import { WishlistCardList } from './WishlistCardList';

/**
 * "Thinking about" on Home: the first few items still under reflection.
 *
 * "See all" appears only once there is something to see, and an empty wishlist
 * is an invitation to add the first item rather than a blank card.
 */
export function WishlistPreviewSection({
  items,
  isLoading,
  onSelect,
  onSeeAll,
  onAdd,
}: {
  items: readonly WishlistItem[] | null;
  isLoading: boolean;
  onSelect: (item: WishlistItem) => void;
  onSeeAll: () => void;
  onAdd: () => void;
}): React.ReactElement {
  const t = useT();
  const hasItems = items != null && items.length > 0;

  return (
    <>
      <SectionHeader
        title={t('home.thinkingAbout')}
        action={hasItems ? { label: t('home.seeAll'), onPress: onSeeAll } : undefined}
      />

      {isLoading ? (
        <LoadingState />
      ) : hasItems ? (
        <WishlistCardList items={items} onSelect={onSelect} />
      ) : (
        <Card padded={false}>
          <EmptyState
            compact
            icon={Clock}
            title={t('home.thinkingEmptyTitle')}
            description={t('home.thinkingEmptyDescription')}
            action={{ label: t('home.addItem'), onPress: onAdd }}
          />
        </Card>
      )}
    </>
  );
}

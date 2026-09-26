import React from 'react';

import { SectionHeader } from '@/components/ui/SectionHeader';
import type { WishlistItem } from '@/types/domain';

import { WishlistCardList } from './WishlistCardList';

/** One group of the full wishlist — ready to decide, or still thinking — under its heading. */
export function WishlistGroup({
  title,
  subtitle,
  items,
  onSelect,
}: {
  title: string;
  subtitle?: string;
  items: readonly WishlistItem[];
  onSelect: (item: WishlistItem) => void;
}): React.ReactElement {
  return (
    <>
      <SectionHeader title={title} subtitle={subtitle} />
      <WishlistCardList items={items} onSelect={onSelect} />
    </>
  );
}

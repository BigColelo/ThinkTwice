import React from 'react';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Spacer } from '@/components/ui/Spacer';
import { AddChoices } from '@/features/add/components/AddChoices';
import { RecentEntryList } from '@/features/add/components/RecentEntryList';
import { recentEntries, type RecentEntry } from '@/features/add/recentEntries';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useGoBack } from '@/features/navigation/useGoBack';
import { useRecentPurchases } from '@/features/purchases/hooks/usePurchases';
import { useWishlistPreview } from '@/features/wishlist/hooks/useWishlist';
import { useT } from '@/i18n';

/**
 * The central add action. One question, two answers — the distinction between
 * something being considered and something already owned is what decides which
 * of the app's two halves the item belongs to.
 */
export default function AddItemScreen(): React.ReactElement {
  const t = useT();
  const router = useAppRouter();
  const goBack = useGoBack('/');

  const wishlist = useWishlistPreview(2);
  const purchases = useRecentPurchases(2);

  const recent = recentEntries(wishlist.data ?? [], purchases.data ?? []);

  // A recent item is content, not a step of the add flow. Leaving the sheet
  // first keeps its detail screen a card — the same thing it is from Home —
  // instead of a third sheet stacked on this one, and makes "back" from it lead
  // to Home rather than into a flow that is over.
  const openEntry = (entry: RecentEntry): void => {
    if (router.canDismiss()) router.dismissAll();
    router.push(entry.href);
  };

  return (
    <>
      <ScreenHeader
        title={t('add.screenTitle')}
        textAction={{ label: t('common.close'), onPress: goBack }}
      />

      <Screen scroll>
        <AddChoices
          onWantToBuy={() => router.push('/add/wishlist')}
          onAlreadyOwn={() => router.push('/add/purchase')}
        />

        {recent.length > 0 ? (
          <>
            <Spacer size="xl" />
            <SectionHeader title={t('add.recent')} />
            <RecentEntryList entries={recent} onSelect={openEntry} />
          </>
        ) : null}
      </Screen>
    </>
  );
}

import { useRouter } from 'expo-router';
import React from 'react';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useRepositories } from '@/db/DatabaseProvider';
import { useMonthlyFinances } from '@/features/money/hooks/useMonthlyFinances';
import { useGoBack } from '@/features/navigation/useGoBack';
import { useSettings } from '@/features/settings/SettingsProvider';
import { WishlistItemForm } from '@/features/wishlist/components/WishlistItemForm';
import {
  createWishlistItem,
  type CreateWishlistItemInput,
} from '@/features/wishlist/services/wishlistActions';
import { useT } from '@/i18n';

/**
 * "Something I want to buy." The fields live in `WishlistItemForm`, which the
 * edit screen shares; this screen owns what saving means.
 */
export default function AddWishlistItemScreen(): React.ReactElement {
  const router = useRouter();
  const t = useT();
  const goBack = useGoBack('/');
  const repositories = useRepositories();
  const { settings } = useSettings();
  const { finances } = useMonthlyFinances();

  const handleSubmit = async (values: CreateWishlistItemInput): Promise<void> => {
    const item = await createWishlistItem(repositories, values, {
      scheduleReminder: settings.cooldownRemindersEnabled,
    });

    // Leave the add flow entirely, then open the item — so "back" from the
    // detail screen returns to Home rather than to a form that no longer applies.
    if (router.canDismiss()) router.dismissAll();
    router.push(`/wishlist/${item.id}`);
  };

  return (
    <>
      {/* A text action rather than a chevron: the form is presented as a sheet,
          and it is dismissed rather than popped. Same control as the other
          modal form in the app, `money/commitment`. */}
      <ScreenHeader
        title={t('add.wantToBuy')}
        textAction={{ label: t('common.cancel'), onPress: goBack }}
      />
      <WishlistItemForm
        finances={finances}
        submitLabel={t('add.startThinking')}
        onSubmit={handleSubmit}
      />
    </>
  );
}

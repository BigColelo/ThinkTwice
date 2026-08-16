import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useRepositories } from '@/db/DatabaseProvider';
import { isDecided } from '@/domain';
import { useMonthlyFinances } from '@/features/money/hooks/useMonthlyFinances';
import { useGoBack } from '@/features/navigation/useGoBack';
import { useSettings } from '@/features/settings/SettingsProvider';
import { WishlistItemForm } from '@/features/wishlist/components/WishlistItemForm';
import { useWishlistItem } from '@/features/wishlist/hooks/useWishlist';
import {
  updateWishlistItem,
  type CreateWishlistItemInput,
} from '@/features/wishlist/services/wishlistActions';
import { useT } from '@/i18n';

/**
 * Editing an item still under reflection.
 *
 * The same form as adding one, prefilled. What happens to the reflection period
 * is decided by the service, not here: corrections leave it alone, and a changed
 * price moves its end date while keeping the day it started.
 */
export default function EditWishlistItemScreen(): React.ReactElement {
  const t = useT();
  const repositories = useRepositories();
  const { settings } = useSettings();
  const { finances } = useMonthlyFinances();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Both leaving and saving land on the item being edited, which is where the
  // screen was opened from; the fallback only applies to a link straight here.
  const goBack = useGoBack(`/wishlist/${id}`);

  const { data: item, isLoading, error, refetch } = useWishlistItem(id);

  const decided = item != null && isDecided(item.status);

  if (isLoading) {
    return (
      <>
        <ScreenHeader title={t('add.editItem')} onBack={goBack} />
        <Screen>
          <LoadingState />
        </Screen>
      </>
    );
  }

  if (error || !item || decided) {
    return (
      <>
        <ScreenHeader title={t('add.editItem')} onBack={goBack} />
        <Screen>
          <ErrorState
            title={decided ? t('add.itemDecidedTitle') : t('wishlist.notFound')}
            description={
              decided ? t('add.itemDecidedDescription') : t('wishlist.notFoundDescription')
            }
            onRetry={decided ? undefined : refetch}
          />
        </Screen>
      </>
    );
  }

  const handleSubmit = async (values: CreateWishlistItemInput): Promise<void> => {
    await updateWishlistItem(repositories, item, values, {
      scheduleReminder: settings.cooldownRemindersEnabled,
      finances,
    });

    // Back to the item, which now shows the revised period.
    goBack();
  };

  return (
    <>
      <ScreenHeader title={t('add.editItem')} onBack={goBack} />
      <WishlistItemForm
        finances={finances}
        item={item}
        submitLabel={t('add.saveChanges')}
        onSubmit={handleSubmit}
      />
    </>
  );
}

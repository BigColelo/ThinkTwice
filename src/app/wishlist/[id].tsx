import { useLocalSearchParams } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { LoadingScreen, MissingRecordScreen } from '@/components/ui/RecordScreens';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Spacer } from '@/components/ui/Spacer';
import { useRepositories } from '@/db/DatabaseProvider';
import {
  calculateCooldownState,
  calculatePurchaseImpact,
  calculateUsageEstimate,
  isDecided,
} from '@/domain';
import { useConfirm } from '@/features/dialogs/useConfirm';
import { useAsyncAction } from '@/features/forms/useAsyncAction';
import { useMonthlyFinances } from '@/features/money/hooks/useMonthlyFinances';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useDeleteAndLeave } from '@/features/navigation/useDeleteAndLeave';
import { useGoBack } from '@/features/navigation/useGoBack';
import { ConfirmPurchaseSheet } from '@/features/wishlist/components/ConfirmPurchaseSheet';
import { DecisionBar } from '@/features/wishlist/components/DecisionBar';
import { ExpectedUsageCard } from '@/features/wishlist/components/ExpectedUsageCard';
import { PurchaseImpactCard } from '@/features/wishlist/components/PurchaseImpactCard';
import { WishlistItemIdentity } from '@/features/wishlist/components/WishlistItemIdentity';
import { WishlistItemStatus } from '@/features/wishlist/components/WishlistItemStatus';
import { WishlistNotesCard } from '@/features/wishlist/components/WishlistNotesCard';
import { wishlistDeleteConfirmation } from '@/features/wishlist/deleteConfirmation';
import { useWishlistItem } from '@/features/wishlist/hooks/useWishlist';
import {
  convertWishlistItemToPurchase,
  deleteWishlistItem,
  dismissWishlistItem,
  type ConvertToPurchaseOptions,
} from '@/features/wishlist/services/wishlistActions';
import { useT } from '@/i18n';

/**
 * The reflection screen — the heart of ThinkTwice.
 *
 * It presents the price in the user's own terms and then steps out of the way.
 * Both decisions are given equal visual weight; nothing on this screen argues
 * for either one.
 */
export default function WishlistDetailScreen(): React.ReactElement {
  const t = useT();
  const router = useAppRouter();
  const repositories = useRepositories();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack('/wishlist');
  const confirm = useConfirm();

  const { data: liveItem, isLoading, error, refetch } = useWishlistItem(id);
  // Deleting removes the row this screen reads, so it keeps the copy it was
  // showing until the navigation away has finished.
  const { data: item, isDeleting, remove } = useDeleteAndLeave(liveItem, goBack);
  const { finances } = useMonthlyFinances();

  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false);
  // One per action. Starting either drops the other's message, so the line above
  // the delete button always speaks about the last thing the user tried.
  const dismissal = useAsyncAction();
  const deletion = useAsyncAction();

  const cooldown = useMemo(() => (item ? calculateCooldownState(item) : null), [item]);
  const impact = useMemo(
    () => (item ? calculatePurchaseImpact(item.priceCents, finances) : null),
    [item, finances],
  );

  // The sheet collects the two facts the wishlist item cannot know — what was
  // paid and when — and surfaces its own failure, so this only navigates.
  const handlePurchaseConfirmed = async (
    options: Required<ConvertToPurchaseOptions>,
  ): Promise<void> => {
    if (!item) return;
    const purchase = await convertWishlistItemToPurchase(repositories, item, options);
    setIsConfirmingPurchase(false);
    router.replace(`/purchase/${purchase.id}`);
  };

  const handleDismissed = async (): Promise<void> => {
    if (!item) return;
    const confirmed = await confirm({
      title: t('wishlist.dismissTitle'),
      message: t('wishlist.dismissMessage'),
      confirmLabel: t('wishlist.dismissConfirm'),
    });
    if (!confirmed) return;

    deletion.reset();
    const dismissed = await dismissal.run(() => dismissWishlistItem(repositories, item.id), {
      errorMessage: t('wishlist.dismissError'),
      stayBusyOnSuccess: true,
    });
    if (dismissed) goBack();
  };

  const handleDelete = async (): Promise<void> => {
    if (!item) return;
    // What is lost depends on where the item is in its life; the copy says which.
    const confirmed = await confirm(wishlistDeleteConfirmation(t, item.status));
    if (!confirmed) return;

    dismissal.reset();
    await deletion.run(() => remove(() => deleteWishlistItem(repositories, item)), {
      errorMessage: t('wishlist.deleteError'),
    });
  };

  if (isLoading) return <LoadingScreen onBack={goBack} />;

  if (error || !item) {
    return (
      <MissingRecordScreen
        onBack={goBack}
        heading={t('wishlist.notFound')}
        description={t('wishlist.notFoundDescription')}
        onRetry={refetch}
      />
    );
  }

  const decided = isDecided(item.status);

  // The same pair the form previewed while this item was being added, computed
  // the same way — an item's own screen must not disagree with the estimate the
  // decision was made on.
  const estimate = calculateUsageEstimate(item.priceCents, {
    frequency: item.expectedUsageFrequency,
    customUsesPerMonth: item.customUsesPerMonth,
    expectedOwnershipMonths: item.expectedOwnershipMonths,
  });

  return (
    <>
      <ScreenHeader
        title={item.name}
        onBack={goBack}
        // Editing is the trailing action; deleting sits at the end of the screen,
        // where an irreversible choice is harder to tap by accident.
        action={
          decided
            ? undefined
            : {
                icon: Pencil,
                accessibilityLabel: t('wishlist.editLabel'),
                onPress: () => router.push(`/wishlist/edit/${item.id}`),
              }
        }
      />

      <Screen
        scroll
        footer={
          decided ? undefined : (
            <DecisionBar
              onDismiss={handleDismissed}
              onBought={() => setIsConfirmingPurchase(true)}
              isDismissing={dismissal.isRunning}
            />
          )
        }
      >
        <WishlistItemIdentity item={item} />
        <WishlistItemStatus item={item} cooldown={cooldown} />

        <Spacer size="xl" />
        <SectionHeader title={t('impact.sectionTitle')} />
        {impact ? <PurchaseImpactCard impact={impact} /> : null}

        <Spacer size="xl" />
        <SectionHeader title={t('wishlist.expectedUsageTitle')} />
        <ExpectedUsageCard item={item} estimate={estimate} />

        {item.notes ? (
          <>
            <Spacer size="xl" />
            <SectionHeader title={t('wishlist.whyYouWantIt')} />
            <WishlistNotesCard notes={item.notes} />
          </>
        ) : null}

        <InlineError message={dismissal.error ?? deletion.error} spaceAbove="md" />

        <Spacer size="xl" />
        <Button
          label={t('wishlist.delete')}
          variant="destructive"
          icon={Trash2}
          loading={isDeleting}
          onPress={handleDelete}
        />
      </Screen>

      <ConfirmPurchaseSheet
        item={item}
        visible={isConfirmingPurchase}
        onClose={() => setIsConfirmingPurchase(false)}
        onConfirm={handlePurchaseConfirmed}
      />
    </>
  );
}

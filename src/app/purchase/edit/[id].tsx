import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useRepositories } from '@/db/DatabaseProvider';
import type { NewPurchase } from '@/db/repositories';
import { useGoBack } from '@/features/navigation/useGoBack';
import { OwnedPurchaseForm } from '@/features/purchases/components/OwnedPurchaseForm';
import { usePurchaseDetail } from '@/features/purchases/hooks/usePurchases';
import { updatePurchase } from '@/features/purchases/services/purchaseActions';

/**
 * Editing an owned item — the same form as adding one, prefilled.
 *
 * Recorded uses and expenses are untouched by an edit: they belong to the item,
 * not to the figures being corrected, and the real cost is recomputed from both
 * on the next read.
 */
export default function EditPurchaseScreen(): React.ReactElement {
  const router = useRouter();
  const repositories = useRepositories();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack('/purchases');

  const { data, isLoading, error, refetch } = usePurchaseDetail(id);

  if (isLoading) {
    return (
      <>
        <ScreenHeader title="Edit purchase" onBack={goBack} />
        <Screen>
          <LoadingState />
        </Screen>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <ScreenHeader title="Edit purchase" onBack={goBack} />
        <Screen>
          <ErrorState
            title="Purchase not found"
            description="This purchase may have been deleted."
            onRetry={refetch}
          />
        </Screen>
      </>
    );
  }

  const { purchase } = data;

  const handleSubmit = async (values: NewPurchase): Promise<void> => {
    await updatePurchase(repositories, purchase, values);
    router.replace(`/purchase/${purchase.id}`);
  };

  return (
    <>
      <ScreenHeader title="Edit purchase" onBack={goBack} />
      <OwnedPurchaseForm purchase={purchase} submitLabel="Save changes" onSubmit={handleSubmit} />
    </>
  );
}

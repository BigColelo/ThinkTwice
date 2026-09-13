import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LoadingScreen, MissingRecordScreen } from '@/components/ui/RecordScreens';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useRepositories } from '@/db/DatabaseProvider';
import { NewPurchase } from '@/db/repositories';
import { useGoBack } from '@/features/navigation/useGoBack';
import { OwnedPurchaseForm } from '@/features/purchases/components/OwnedPurchaseForm';
import { usePurchaseDetail } from '@/features/purchases/hooks/usePurchases';
import { updatePurchase } from '@/features/purchases/services/purchaseActions';
import { useT } from '@/i18n';

/**
 * Editing an owned item — the same form as adding one, prefilled.
 *
 * Recorded uses and expenses are untouched by an edit: they belong to the item,
 * not to the figures being corrected, and the real cost is recomputed from both
 * on the next read.
 */
export default function EditPurchaseScreen(): React.ReactElement {
  const t = useT();
  const repositories = useRepositories();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Both leaving and saving land on the item being edited, which is where the
  // screen was opened from; the fallback only applies to a link straight here.
  const goBack = useGoBack(`/purchase/${id}`);

  const { data, isLoading, error, refetch } = usePurchaseDetail(id);

  if (isLoading) return <LoadingScreen title={t('add.editPurchase')} onBack={goBack} />;

  if (error || !data) {
    return (
      <MissingRecordScreen
        title={t('add.editPurchase')}
        onBack={goBack}
        heading={t('purchases.notFound')}
        description={t('purchases.notFoundDescription')}
        onRetry={refetch}
      />
    );
  }

  const { purchase } = data;

  const handleSubmit = async (values: NewPurchase): Promise<void> => {
    await updatePurchase(repositories, purchase, values);
    goBack();
  };

  return (
    <>
      <ScreenHeader title={t('add.editPurchase')} onBack={goBack} />
      <OwnedPurchaseForm
        purchase={purchase}
        submitLabel={t('add.saveChanges')}
        onSubmit={handleSubmit}
      />
    </>
  );
}

import { useRouter } from 'expo-router';
import React from 'react';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useRepositories } from '@/db/DatabaseProvider';
import type { NewPurchase } from '@/db/repositories';
import { useGoBack } from '@/features/navigation/useGoBack';
import { OwnedPurchaseForm } from '@/features/purchases/components/OwnedPurchaseForm';
import { createOwnedPurchase } from '@/features/purchases/services/purchaseActions';

/**
 * "Something I already own." The fields live in `OwnedPurchaseForm`, which the
 * edit screen shares; this screen owns what saving means.
 */
export default function AddOwnedPurchaseScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useGoBack('/');
  const repositories = useRepositories();

  const handleSubmit = async (values: NewPurchase): Promise<void> => {
    const purchase = await createOwnedPurchase(repositories, values);

    // Leave the add flow entirely, then open the item — so "back" from the detail
    // screen returns to Home rather than to a form that no longer applies.
    if (router.canDismiss()) router.dismissAll();
    router.push(`/purchase/${purchase.id}`);
  };

  return (
    <>
      <ScreenHeader title="Something I already own" onBack={goBack} />
      <OwnedPurchaseForm submitLabel="Add purchase" onSubmit={handleSubmit} />
    </>
  );
}

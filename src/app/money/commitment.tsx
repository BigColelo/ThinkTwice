import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LoadingScreen, MissingRecordScreen } from '@/components/ui/RecordScreens';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useRepositories } from '@/db/DatabaseProvider';
import { CommitmentForm } from '@/features/money/components/CommitmentForm';
import { useCommitment } from '@/features/money/hooks/useCommitment';
import type { CommitmentFormValues } from '@/features/money/schemas/commitmentSchema';
import {
  createCommitment,
  deleteCommitment,
  updateCommitment,
} from '@/features/money/services/commitmentActions';
import { useGoBack } from '@/features/navigation/useGoBack';
import { useT } from '@/i18n';

/**
 * Add or edit a recurring commitment.
 *
 * One screen serves both, keyed off an optional `id` query parameter — the
 * fields and validation are identical, so splitting them would only duplicate
 * the form. The fields live in `CommitmentForm`; this screen owns what saving
 * means and where it leads.
 */
export default function CommitmentFormScreen(): React.ReactElement {
  const t = useT();
  const repositories = useRepositories();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goBack = useGoBack('/money');

  const isEditing = Boolean(id);
  const { data: commitment, isLoading, error, refetch } = useCommitment(id);

  const title = isEditing ? t('money.commitment.editTitle') : t('money.commitment.addTitle');

  if (isEditing && isLoading) return <LoadingScreen title={title} onBack={goBack} />;

  // Only an edit can fail to find its subject; adding has none to look for.
  if (isEditing && (error || !commitment)) {
    return (
      <MissingRecordScreen
        title={title}
        onBack={goBack}
        heading={t('money.commitment.notFound')}
        description={t('money.commitment.notFoundDescription')}
        onRetry={refetch}
      />
    );
  }

  const handleSubmit = async (values: CommitmentFormValues): Promise<void> => {
    if (commitment) await updateCommitment(repositories, commitment.id, values);
    else await createCommitment(repositories, values);
    goBack();
  };

  const handleDelete = async (): Promise<void> => {
    if (!commitment) return;
    await deleteCommitment(repositories, commitment.id);
    goBack();
  };

  return (
    <>
      <ScreenHeader title={title} textAction={{ label: t('common.cancel'), onPress: goBack }} />
      <CommitmentForm
        commitment={commitment ?? undefined}
        submitLabel={isEditing ? t('money.commitment.saveChanges') : t('money.commitment.addTitle')}
        onSubmit={handleSubmit}
        onDelete={isEditing ? handleDelete : undefined}
      />
    </>
  );
}

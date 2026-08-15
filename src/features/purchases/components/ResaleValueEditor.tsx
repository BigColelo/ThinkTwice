import React, { useState } from 'react';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MoneyField } from '@/components/ui/MoneyField';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Cents } from '@/types/domain';

/**
 * Resale value is the only figure on the purchase screen the user revises over
 * time, so it is edited in place with an explicit save rather than through a form
 * screen — and the save button only appears once there is something to save.
 *
 * `null` clears the estimate and is not the same as `0`: one means the user never
 * said, the other means it is worth nothing today. Both travel through unchanged.
 */

export function ResaleValueEditor({
  valueCents,
  onSave,
}: {
  valueCents: Cents | null;
  /** Rejecting shows the editor's own error; resolving is the caller's to act on. */
  onSave: (valueCents: Cents | null) => Promise<void>;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  const [draft, setDraft] = useState<Cents | null>(valueCents);
  const [lastSavedValue, setLastSavedValue] = useState<Cents | null>(valueCents);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Adopt a value that changed elsewhere (a refetch after saving) without an
  // effect, so the field never renders a frame of stale text.
  if (valueCents !== lastSavedValue) {
    setLastSavedValue(valueCents);
    setDraft(valueCents);
  }

  const hasChanges = draft !== valueCents;

  const save = async (): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(draft);
    } catch {
      setSaveError(t('purchases.resale.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card padding={theme.spacing.md}>
      <MoneyField
        label={t('purchases.resale.label')}
        hint={t('purchases.resale.hint')}
        valueCents={draft}
        onChangeCents={setDraft}
      />

      {saveError ? (
        <AppText
          variant="caption"
          color="danger"
          accessibilityRole="alert"
          style={{ marginTop: theme.spacing.xs }}
        >
          {saveError}
        </AppText>
      ) : null}

      {hasChanges ? (
        <Button
          label={t('purchases.resale.save')}
          size="md"
          onPress={save}
          loading={isSaving}
          style={{ marginTop: theme.spacing.sm }}
        />
      ) : null}
    </Card>
  );
}

import React from 'react';

import { IconTile } from '@/components/ui/IconTile';
import { ListRow } from '@/components/ui/ListRow';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { getCommitmentCategory } from '@/constants/categories';
import { getFrequency } from '@/constants/frequencies';
import { calculateMonthlyCommitmentEquivalent } from '@/domain';
import type { RecurringCommitment } from '@/types/domain';

/**
 * One recurring commitment.
 *
 * The amount shown is the one the user is actually billed. For anything other
 * than a monthly bill the monthly equivalent appears underneath, so a quarterly
 * charge is never read as a monthly one.
 */

export function CommitmentRow({
  commitment,
  onPress,
}: {
  commitment: RecurringCommitment;
  onPress?: () => void;
}): React.ReactElement {
  const category = getCommitmentCategory(commitment.categoryId);
  const frequency = getFrequency(commitment.frequency);
  const isMonthly = commitment.frequency === 'monthly';
  const isPaused = !commitment.isActive;

  const details = isMonthly ? category.label : `${frequency.label} · ${category.label}`;

  return (
    <ListRow
      leading={<IconTile icon={category.icon} tint={category.tint} />}
      title={commitment.name}
      // Paused is said in words rather than shown by dimming the row: a figure
      // the user has to read should not lose contrast to carry a state.
      subtitle={isPaused ? `Paused · ${details}` : details}
      trailing={
        <MoneyValue
          cents={commitment.amountCents}
          variant="bodyStrong"
          color={isPaused ? 'secondary' : 'primary'}
        />
      }
      trailingSubtitle={
        isMonthly || isPaused ? undefined : (
          <MoneyValue
            cents={calculateMonthlyCommitmentEquivalent(commitment)}
            variant="caption"
            color="secondary"
            suffix=" / month"
          />
        )
      }
      onPress={onPress}
      accessibilityLabel={`${commitment.name}, ${category.label}, ${frequency.label}${
        isPaused ? ', paused' : ''
      }`}
      accessibilityHint={onPress ? 'Opens this commitment for editing' : undefined}
    />
  );
}

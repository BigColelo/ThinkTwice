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

  return (
    <ListRow
      leading={<IconTile icon={category.icon} tint={category.tint} />}
      title={commitment.name}
      subtitle={isMonthly ? category.label : `${frequency.label} · ${category.label}`}
      trailing={<MoneyValue cents={commitment.amountCents} variant="bodyStrong" />}
      trailingSubtitle={
        isMonthly ? undefined : (
          <MoneyValue
            cents={calculateMonthlyCommitmentEquivalent(commitment)}
            variant="caption"
            color="secondary"
            suffix=" / month"
          />
        )
      }
      onPress={onPress}
      accessibilityLabel={`${commitment.name}, ${category.label}, ${frequency.label}`}
      accessibilityHint={onPress ? 'Opens this commitment for editing' : undefined}
    />
  );
}
